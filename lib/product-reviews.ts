import { pool } from "@/lib/db";

export class ReviewError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function reviewId(value: unknown) {
  if (!/^[1-9]\d*$/.test(String(value)) || Number(value) > 2147483647)
    throw new ReviewError("Not found.", 404);
  return Number(value);
}
export type OwnReview = { rating: number; body: string; updated_at: string };
export type ReviewItem = {
  productId: number;
  name: string;
  review: OwnReview | null;
};
export type PublicReview = {
  review_id: string;
  author: string;
  rating: number;
  body: string;
  created_at: string;
  updated_at: string;
};
export type ReviewSummary = {
  total: number;
  average: number;
  distribution: { rating: number; count: number }[];
};
export type ProductReviewData = {
  reviews: PublicReview[];
  summary: ReviewSummary;
  page: number;
  totalPages: number;
};
export function validateReview(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ReviewError("Invalid review.");
  const input = value as Record<string, unknown>;
  const productId = reviewId(input.productId);
  if (
    !Number.isInteger(input.rating) ||
    Number(input.rating) < 1 ||
    Number(input.rating) > 5
  )
    throw new ReviewError("Choose a rating from 1 to 5.");
  if (
    typeof input.body !== "string" ||
    input.body.trim().length < 10 ||
    input.body.trim().length > 2000
  )
    throw new ReviewError("Review must be 10–2000 characters.");
  return { productId, rating: Number(input.rating), body: input.body.trim() };
}
export async function orderReviews(orderId: number, userId: number) {
  const order = (
    await pool.query(
      "SELECT order_status,payment_status FROM orders WHERE order_id=$1 AND user_id=$2",
      [orderId, userId],
    )
  ).rows[0];
  if (!order) throw new ReviewError("Order not found.", 404);
  const items = (
    await pool.query<ReviewItem>(
      `SELECT DISTINCT oi.product_id AS "productId",p.product_name AS name,
    CASE WHEN r.review_id IS NULL THEN NULL ELSE jsonb_build_object('rating',r.rating,'body',r.body,'updated_at',r.updated_at) END AS review
    FROM order_items oi JOIN products p ON p.product_id=oi.product_id
    LEFT JOIN product_reviews r ON r.product_id=oi.product_id AND r.user_id=$2
    WHERE oi.order_id=$1 ORDER BY oi.product_id`,
      [orderId, userId],
    )
  ).rows;
  return {
    eligible:
      order.order_status === "DELIVERED" && order.payment_status === "paid",
    items,
  };
}
export async function saveReview(
  orderId: number,
  userId: number,
  input: unknown,
) {
  const { productId, rating, body } = validateReview(input);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    const order = (
      await client.query(
        `SELECT o.order_status,o.payment_status FROM orders o JOIN users u ON u.user_id=o.user_id
      WHERE o.order_id=$1 AND o.user_id=$2 AND u.is_suspended=false FOR SHARE OF o,u`,
        [orderId, userId],
      )
    ).rows[0];
    if (!order) throw new ReviewError("Order not found.", 404);
    if (order.order_status !== "DELIVERED" || order.payment_status !== "paid")
      throw new ReviewError(
        "Reviews are available for delivered, paid orders.",
        409,
      );
    const purchased = (
      await client.query(
        "SELECT 1 FROM order_items WHERE order_id=$1 AND product_id=$2",
        [orderId, productId],
      )
    ).rows.length;
    if (!purchased)
      throw new ReviewError(
        "This product was not purchased in this order.",
        403,
      );
    const review = (
      await client.query<OwnReview>(
        `INSERT INTO product_reviews(user_id,product_id,order_id,rating,body)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,product_id) DO UPDATE
      SET rating=EXCLUDED.rating,body=EXCLUDED.body,updated_at=now()
      RETURNING rating,body,updated_at`,
        [userId, productId, orderId, rating, body],
      )
    ).rows[0];
    await client.query("COMMIT");
    return review;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function publicReviews(
  productId: number,
  page: number,
): Promise<ProductReviewData> {
  if (!Number.isInteger(page) || page < 1 || page > 10000)
    throw new ReviewError("Invalid page.");
  if (
    !(
      await pool.query(
        "SELECT 1 FROM products WHERE product_id=$1 AND is_archived=false",
        [productId],
      )
    ).rows.length
  )
    throw new ReviewError("Product not found.", 404);
  // A single statement keeps the summary and paginated reviews on the same snapshot.
  const result = (
    await pool.query(
      `WITH matching AS (SELECT r.*,u.first_name,u.last_name FROM product_reviews r JOIN users u ON u.user_id=r.user_id WHERE r.product_id=$1),
    recent AS (SELECT review_id,rating,body,created_at,updated_at,
      COALESCE(NULLIF(btrim(first_name),''),'Customer') || CASE WHEN NULLIF(btrim(last_name),'') IS NOT NULL THEN ' ' || left(btrim(last_name),1) || '.' ELSE '' END AS author
      FROM matching ORDER BY created_at DESC,review_id DESC LIMIT 10 OFFSET $2)
    SELECT (SELECT COALESCE(json_agg(recent ORDER BY created_at DESC,review_id DESC),'[]'::json) FROM recent) AS reviews,
      count(*)::integer AS total,COALESCE(round(avg(rating),1),0)::float AS average,
      json_build_array(json_build_object('rating',5,'count',count(*) FILTER(WHERE rating=5)),
        json_build_object('rating',4,'count',count(*) FILTER(WHERE rating=4)),json_build_object('rating',3,'count',count(*) FILTER(WHERE rating=3)),
        json_build_object('rating',2,'count',count(*) FILTER(WHERE rating=2)),json_build_object('rating',1,'count',count(*) FILTER(WHERE rating=1))) AS distribution
    FROM matching`,
      [productId, (page - 1) * 10],
    )
  ).rows[0];
  return {
    reviews: result.reviews,
    summary: {
      total: result.total,
      average: result.average,
      distribution: result.distribution,
    },
    page,
    totalPages: Math.max(1, Math.ceil(result.total / 10)),
  };
}
