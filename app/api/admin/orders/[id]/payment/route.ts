import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { requireUser } from "@/lib/require-user";
import {
  fetchPayment,
  finalizePayment,
  matchesPayment,
} from "@/lib/paymongo-payment";

// Recovery performs only a provider GET. It never creates a payment or refund.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser(req);
  if (user.error) return user.error;
  const admin = await requireAdmin(req);
  if (admin.error) return admin.error;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (
    !/^[1-9]\d*$/.test(id) ||
    Number(id) > 2147483647 ||
    typeof body?.paymentId !== "string" ||
    !/^pay_[a-zA-Z0-9]{1,96}$/.test(body.paymentId)
  ) {
    return Response.json(
      { error: "Enter a valid order and PayMongo payment ID." },
      { status: 400 },
    );
  }
  try {
    const result = await pool.query(
      "SELECT * FROM orders WHERE order_id = $1",
      [id],
    );
    const order = result.rows[0];
    if (!order)
      return Response.json({ error: "Order not found." }, { status: 404 });
    if (!["gcash", "grabpay"].includes(order.payment_method)) {
      return Response.json(
        { error: "This order does not use PayMongo." },
        { status: 409 },
      );
    }
    const payment = await fetchPayment(body.paymentId);
    if (
      !matchesPayment(payment, order) ||
      payment.attributes.status !== "paid"
    ) {
      return Response.json(
        {
          error:
            "This captured payment does not match the order's source, amount, currency and mode.",
        },
        { status: 409 },
      );
    }
    await finalizePayment(order, payment);
    return Response.json(
      { paymentStatus: "paid" },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error(`Order ${id}: captured payment recovery failed`, error);
    return Response.json(
      {
        error:
          "Unable to verify or finalize this payment. Check the provider dashboard before trying again.",
      },
      { status: 502 },
    );
  }
}
