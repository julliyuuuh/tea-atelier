import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import {
  parseAddress,
  parseDefaults,
  parseBillingDetails,
} from "@/lib/profile-address";
import {
  ADDRESS_COLUMNS,
  clearOtherDefaults,
  lockAddressOwner,
} from "@/lib/profile-address-store";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Context) {
  const { userId, error } = await requireUser(req);
  if (error) return error;
  const { id } = await params;
  if (!/^\d+$/.test(id))
    return NextResponse.json({ error: "Invalid address ID." }, { status: 400 });
  let address;
  let defaults;
  let details;
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("Invalid address.");
    defaults = parseDefaults(body);
    details = parseBillingDetails(body);
    const changesAddress = [
      "street",
      "addressLine1",
      "addressLine2",
      "addressLine3",
      "barangay",
    ].some((key) => body[key] !== undefined);
    address = changesAddress ? parseAddress(body) : null;
    if (
      !address &&
      Object.values(details).every((value) => value === undefined) &&
      defaults.shipping === undefined &&
      defaults.billing === undefined
    )
      throw new Error("No fields to update.");
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid address." },
      { status: 400 },
    );
  }
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await lockAddressOwner(client, userId);
    const { rows } = await client.query(
      `SELECT ${ADDRESS_COLUMNS} FROM user_address
       WHERE address_id = $1 AND user_id = $2 AND is_deleted = false AND is_saved = true`,
      [id, userId],
    );
    const old = rows[0];
    if (!old) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Address not found." },
        { status: 404 },
      );
    }
    const shipping = defaults.shipping ?? old.default_address;
    const billing = defaults.billing ?? old.default_billing;
    await clearOtherDefaults(client, userId, shipping, billing);
    // Orders reference address rows. Replace an edited profile address instead
    // of rewriting the delivery details of orders already placed.
    const changesDetails = Object.values(details).some(
      (value) => value !== undefined,
    );
    const replacement = address ?? {
      addressLine1: old.address_line1,
      addressLine2: old.address_line2,
      addressLine3: old.address_line3,
      barangay: old.barangay,
    };
    const businessName =
      details.businessName === undefined
        ? old.business_name
        : details.businessName;
    const billingContact =
      details.billingContact === undefined
        ? old.billing_contact
        : details.billingContact;
    const taxId = details.taxId === undefined ? old.tax_id : details.taxId;
    const result =
      address || changesDetails
        ? await client.query(
            `INSERT INTO user_address (user_id, address_line1, address_line2, address_line3, barangay,
         default_address, default_billing, business_name, billing_contact, tax_id, is_deleted, is_saved)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, true) RETURNING ${ADDRESS_COLUMNS}`,
            [
              userId,
              replacement.addressLine1,
              replacement.addressLine2,
              replacement.addressLine3,
              replacement.barangay,
              shipping,
              billing,
              businessName ?? null,
              billingContact ?? null,
              taxId ?? null,
            ],
          )
        : await client.query(
            `UPDATE user_address SET default_address = $2, default_billing = $3
         WHERE address_id = $1 RETURNING ${ADDRESS_COLUMNS}`,
            [id, shipping, billing],
          );
    if (address || changesDetails)
      await client.query(
        "UPDATE user_address SET is_deleted = true, is_saved = false, default_address = false, default_billing = false WHERE address_id = $1",
        [id],
      );
    await client.query("COMMIT");
    return NextResponse.json({ address: result.rows[0] });
  } catch {
    if (client) await client.query("ROLLBACK");
    return NextResponse.json(
      { error: "Unable to update address." },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}

export async function DELETE(req: Request, { params }: Context) {
  const { userId, error } = await requireUser(req);
  if (error) return error;
  const { id } = await params;
  if (!/^\d+$/.test(id))
    return NextResponse.json({ error: "Invalid address ID." }, { status: 400 });
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await lockAddressOwner(client, userId);
    const { rows } = await client.query(
      `UPDATE user_address SET is_deleted = true, is_saved = false, default_address = false, default_billing = false
       WHERE address_id = $1 AND user_id = $2 AND is_deleted = false AND is_saved = true RETURNING address_id`,
      [id, userId],
    );
    await client.query("COMMIT");
    if (!rows.length)
      return NextResponse.json(
        { error: "Address not found." },
        { status: 404 },
      );
    return NextResponse.json({ success: true });
  } catch {
    if (client) await client.query("ROLLBACK");
    return NextResponse.json(
      { error: "Unable to remove address." },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}
