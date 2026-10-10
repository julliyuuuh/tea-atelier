import type { PoolClient } from "pg";

export const ADDRESS_COLUMNS =
  "address_id, address_line1, address_line2, address_line3, barangay, default_address, default_billing, business_name, billing_contact, tax_id, address_label";

// Serialize all profile address writes for a customer, including concurrent
// requests to choose a default, so at most one saved address has each default.
export async function lockAddressOwner(client: PoolClient, userId: number) {
  await client.query(
    "SELECT user_id FROM users WHERE user_id = $1 FOR UPDATE",
    [userId],
  );
}

export async function clearOtherDefaults(
  client: PoolClient,
  userId: number,
  shipping: boolean,
  billing: boolean,
) {
  await client.query(
    `UPDATE user_address SET
       default_address = CASE WHEN $2 THEN false ELSE default_address END,
       default_billing = CASE WHEN $3 THEN false ELSE default_billing END
     WHERE user_id = $1 AND is_deleted = false AND is_saved = true`,
    [userId, shipping, billing],
  );
}
