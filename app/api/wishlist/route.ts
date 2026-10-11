import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  try {
    const result = await pool.query(
      `SELECT p.product_id,p.product_name,p.product_desc,p.product_image,p.category,p.sub_category,p.type,p.price,p.status,p.stock_quantity,p.is_archived
       FROM wishlist w JOIN products p ON p.product_id=w.product_id
       WHERE w.user_id=$1 ORDER BY w.created_at DESC,w.product_id DESC`,
      [auth.userId],
    );
    return NextResponse.json(
      {
        items: result.rows.map((row) => ({
          id: String(row.product_id),
          name: row.product_name,
          description: row.product_desc,
          image: row.product_image,
          category: row.category,
          subCategory: row.sub_category,
          type: row.type,
          price: Number(row.price),
          stockQuantity: row.stock_quantity,
          isArchived: row.is_archived,
          availability:
            !row.is_archived &&
            row.stock_quantity > 0 &&
            row.status === "IN STOCK"
              ? "In Stock"
              : "Out of Stock",
        })),
      },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to load your wishlist. Please try again." },
      { status: 500, headers },
    );
  }
}
async function change(req: Request, remove: boolean) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => null);
  const raw = body?.productId;
  const id =
    typeof raw === "string" && /^[1-9]\d*$/.test(raw) ? Number(raw) : raw;
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => key !== "productId") ||
    !Number.isSafeInteger(id) ||
    id < 1 ||
    id > 2147483647
  )
    return NextResponse.json(
      { error: "Enter a valid product ID." },
      { status: 400 },
    );
  try {
    if (remove) {
      await pool.query(
        "DELETE FROM wishlist WHERE user_id=$1 AND product_id=$2",
        [auth.userId, id],
      );
    } else {
      const result = await pool.query(
        `INSERT INTO wishlist(user_id,product_id)
         SELECT $1,product_id FROM products WHERE product_id=$2 AND is_archived=false
         ON CONFLICT(user_id,product_id) DO UPDATE SET product_id=EXCLUDED.product_id
         RETURNING product_id`,
        [auth.userId, id],
      );
      if (!result.rows.length)
        return NextResponse.json(
          { error: "This product is no longer available." },
          { status: 404 },
        );
    }
    return NextResponse.json({ success: true }, { headers });
  } catch {
    return NextResponse.json(
      { error: "Unable to update your wishlist. Please try again." },
      { status: 500, headers },
    );
  }
}
export const POST = (req: Request) => change(req, false);
export const DELETE = (req: Request) => change(req, true);
