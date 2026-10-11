import { pool } from "@/lib/db";

export class CartError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function cartProductId(value: unknown): number {
  const id =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^[1-9]\d*$/.test(value)
        ? Number(value)
        : NaN;
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647)
    throw new CartError("Choose a valid product.");
  return id;
}

export function cartQuantity(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > 2147483647
  )
    throw new CartError("Quantity must be a positive whole number.");
  return value;
}

export async function changeCartItem(
  userId: number,
  productId: number,
  quantity: number,
  add: boolean,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const owner = await client.query(
      "SELECT user_id FROM users WHERE user_id = $1 AND is_suspended = false FOR UPDATE",
      [userId],
    );
    if (!owner.rows.length)
      throw new CartError("Active account access is required.", 403);
    const result = await client.query(
      "SELECT stock_quantity, status, is_archived FROM products WHERE product_id = $1 FOR SHARE",
      [productId],
    );
    const product = result.rows[0];
    if (!product || product.is_archived)
      throw new CartError("This product is no longer available.", 404);
    if (product.status !== "IN STOCK" || product.stock_quantity <= 0)
      throw new CartError("This product is out of stock.", 409);
    const current = await client.query(
      "SELECT quantity FROM cart WHERE user_id = $1 AND product_id = $2 FOR UPDATE",
      [userId, productId],
    );
    if (!add && !current.rows.length)
      throw new CartError("This product is no longer in your cart.", 404);
    const next = add ? (current.rows[0]?.quantity ?? 0) + quantity : quantity;
    if (next > product.stock_quantity)
      throw new CartError(`Only ${product.stock_quantity} in stock.`, 409);
    if (current.rows.length) {
      await client.query(
        "UPDATE cart SET quantity = $1 WHERE user_id = $2 AND product_id = $3",
        [next, userId, productId],
      );
    } else {
      await client.query(
        "INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)",
        [userId, productId, next],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
