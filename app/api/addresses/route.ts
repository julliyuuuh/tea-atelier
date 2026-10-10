import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import {
  parseAddress,
  parseDefaults,
  parseBillingDetails,
  parseAddressLabel,
} from "@/lib/profile-address";
import {
  ADDRESS_COLUMNS,
  clearOtherDefaults,
  lockAddressOwner,
} from "@/lib/profile-address-store";

export async function GET(req: Request) {
  const { userId, error } = await requireUser(req);
  if (error) return error;
  try {
    const { rows } = await pool.query(
      `SELECT ${ADDRESS_COLUMNS} FROM user_address
       WHERE user_id = $1 AND is_deleted = false AND is_saved = true
       ORDER BY default_address DESC, default_billing DESC, address_id ASC`,
      [userId],
    );
    return NextResponse.json({ addresses: rows });
  } catch {
    return NextResponse.json(
      { error: "Unable to load addresses." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const { userId, error } = await requireUser(req);
  if (error) return error;
  let address;
  let defaults;
  let details;
  let label;
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("Invalid address.");
    address = parseAddress(body);
    defaults = parseDefaults(body);
    details = parseBillingDetails(body);
    label = parseAddressLabel(body);
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
    const existing = await client.query(
      `SELECT ${ADDRESS_COLUMNS} FROM user_address WHERE user_id = $1
       AND address_line1 = $2 AND address_line2 IS NOT DISTINCT FROM $3
       AND address_line3 IS NOT DISTINCT FROM $4
       AND business_name IS NOT DISTINCT FROM $5
       AND billing_contact IS NOT DISTINCT FROM $6
       AND tax_id IS NOT DISTINCT FROM $7
       AND address_label IS NOT DISTINCT FROM $8 AND is_deleted = false
       ORDER BY is_saved DESC, address_id ASC LIMIT 1`,
      [
        userId,
        address.addressLine1,
        address.addressLine2,
        address.addressLine3,
        details.businessName ?? null,
        details.billingContact ?? null,
        details.taxId ?? null,
        label ?? null,
      ],
    );
    const old = existing.rows[0];
    const shipping = defaults.shipping ?? old?.default_address ?? false;
    const billing = defaults.billing ?? old?.default_billing ?? false;
    await clearOtherDefaults(client, userId, shipping, billing);
    const { rows } = old
      ? await client.query(
          `UPDATE user_address SET is_saved = true, default_address = $2, default_billing = $3
         WHERE address_id = $1 RETURNING ${ADDRESS_COLUMNS}`,
          [old.address_id, shipping, billing],
        )
      : await client.query(
          `INSERT INTO user_address (user_id, address_line1, address_line2, address_line3, barangay,
          default_address, default_billing, business_name, billing_contact, tax_id, address_label, is_deleted, is_saved)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, true) RETURNING ${ADDRESS_COLUMNS}`,
          [
            userId,
            address.addressLine1,
            address.addressLine2,
            address.addressLine3,
            address.barangay,
            shipping,
            billing,
            details.businessName ?? null,
            details.billingContact ?? null,
            details.taxId ?? null,
            label ?? null,
          ],
        );
    await client.query("COMMIT");
    return NextResponse.json({ address: rows[0] });
  } catch {
    if (client) await client.query("ROLLBACK");
    return NextResponse.json(
      { error: "Unable to save address." },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}
