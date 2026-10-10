import type { PoolClient } from "pg";

export function parseSavedAddressId(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Choose a valid saved address.");
  }
  return value;
}

export async function getSavedDeliveryAddress(
  client: PoolClient,
  userId: number,
  addressId: number,
) {
  const { rows } = await client.query(
    `SELECT address_line1, address_line2, address_line3, barangay
     FROM user_address WHERE address_id = $1 AND user_id = $2
       AND is_saved = true AND is_deleted IS NOT TRUE FOR SHARE`,
    [addressId, userId],
  );
  return rows[0] ?? null;
}
