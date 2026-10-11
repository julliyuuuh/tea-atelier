import { setAuditActor } from "@/lib/admin-audit";
import type { PoolClient } from "pg";
import { pool } from "@/lib/db";
import {
  allowedRequest,
  ReturnError,
  textField,
  toCents,
  RETURN_REASONS,
  type ReturnCase,
  type ReturnKind,
} from "@/lib/returns";
import {
  getPayment,
  validatePayment,
  createRefund,
  checkRefund,
  RefundProviderError,
} from "@/lib/paymongo-refunds";
import { isCod } from "@/lib/payment-status";

type Order = {
  order_id: number;
  user_id: number;
  order_status: string;
  payment_status: string;
  payment_method: string;
  total_amount: string;
  paymongo_payment_id: string | null;
  paymongo_source_id: string | null;
};
type Attempt = {
  attempt_id: string;
  return_id: string;
  amount_cents: number;
  state: string;
  channel: string;
  payment_id: string | null;
  provider_refund_id: string | null;
};
async function transaction<T>(
  actorId: number | undefined,
  work: (client: PoolClient) => Promise<T>,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    if (actorId !== undefined) await setAuditActor(client, actorId);
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
async function lockCase(client: PoolClient, id: string) {
  // Every mutation takes locks in order → return → attempt order.
  const found = await client.query(
    "SELECT order_id FROM order_returns WHERE return_id=$1",
    [id],
  );
  if (!found.rows[0]) throw new ReturnError("Request not found.", 404);
  const order = (
    await client.query<Order>(
      "SELECT order_id,user_id,order_status,payment_status,payment_method,total_amount,paymongo_payment_id,paymongo_source_id FROM orders WHERE order_id=$1 FOR UPDATE",
      [found.rows[0].order_id],
    )
  ).rows[0];
  const request = (
    await client.query<ReturnCase>(
      "SELECT * FROM order_returns WHERE return_id=$1 FOR UPDATE",
      [id],
    )
  ).rows[0];
  return { order, request };
}
async function event(
  client: PoolClient,
  request: ReturnCase,
  actorId: number,
  action: string,
  note = "",
) {
  await client.query(
    "INSERT INTO return_events(return_id,actor_id,action,note) VALUES($1,$2,$3,$4)",
    [request.return_id, actorId, action, note],
  );
}
async function notify(client: PoolClient, request: ReturnCase, title: string) {
  await client.query(
    `INSERT INTO notifications(user_id,order_id,event_key,status,title,message)
    VALUES($1,$2,$3,'RETURN_UPDATE',$4,$5) ON CONFLICT(event_key) DO NOTHING`,
    [
      request.user_id,
      request.order_id,
      `return:${request.return_id}:${request.version}`,
      title,
      `Order #TA-${request.order_id}: ${title}. View your order for details.`,
    ],
  );
}
export async function readCustomerReturn(orderId: number, userId: number) {
  const order = (
    await pool.query<Order>(
      "SELECT order_id,order_status,payment_status FROM orders WHERE order_id=$1 AND user_id=$2",
      [orderId, userId],
    )
  ).rows[0];
  if (!order) throw new ReturnError("Order not found.", 404);
  const request =
    (
      await pool.query(
        `SELECT r.return_id,r.order_id,r.kind,r.reason,r.details,r.status,r.refund_amount_cents,
    r.customer_message,r.created_at,r.updated_at,a.state AS refund_state,a.channel AS refund_channel,a.is_test AS refund_is_test
    FROM order_returns r LEFT JOIN LATERAL (SELECT state,channel,is_test FROM return_refund_attempts WHERE return_id=r.return_id
      ORDER BY created_at DESC,attempt_id DESC LIMIT 1) a ON TRUE WHERE r.order_id=$1 AND r.user_id=$2`,
        [orderId, userId],
      )
    ).rows[0] ?? null;
  return {
    request,
    canReturn: allowedRequest(order, "RETURN"),
    canRefund: allowedRequest(order, "REFUND"),
  };
}
export async function createReturn(
  orderId: number,
  userId: number,
  body: Record<string, unknown>,
) {
  const kind = body.kind as ReturnKind;
  if (!["RETURN", "REFUND"].includes(kind))
    throw new ReturnError("Choose return or refund.");
  if (
    typeof body.reason !== "string" ||
    !Object.hasOwn(RETURN_REASONS, body.reason)
  )
    throw new ReturnError("Choose a valid reason.");
  const details = textField(body.details, "Details", 10);
  return transaction(undefined, async (client) => {
    const order = (
      await client.query<Order>(
        "SELECT order_id,user_id,order_status,payment_status FROM orders WHERE order_id=$1 AND user_id=$2 FOR UPDATE",
        [orderId, userId],
      )
    ).rows[0];
    if (!order) throw new ReturnError("Order not found.", 404);
    const existing = (
      await client.query<ReturnCase>(
        "SELECT * FROM order_returns WHERE order_id=$1",
        [orderId],
      )
    ).rows[0];
    if (existing) {
      if (
        existing.kind !== kind ||
        existing.reason !== body.reason ||
        existing.details !== details
      )
        throw new ReturnError("A request already exists for this order.", 409);
      return existing.return_id; // Retry after a lost response creates no duplicate.
    }
    if (!allowedRequest(order, kind))
      throw new ReturnError(
        "This order is not eligible for that request.",
        409,
      );
    const request = (
      await client.query<ReturnCase>(
        `INSERT INTO order_returns(order_id,user_id,kind,reason,details)
      VALUES($1,$2,$3,$4,$5) RETURNING *`,
        [orderId, userId, kind, body.reason, details],
      )
    ).rows[0];
    await event(client, request, userId, "REQUESTED");
    await notify(
      client,
      request,
      kind === "RETURN" ? "Return requested" : "Refund requested",
    );
    return request.return_id;
  });
}
export async function listAdminReturns(
  page: number,
  status: string | null,
  search = "",
) {
  const term = search.trim();
  if (term.length > 100)
    throw new ReturnError("Search must be 100 characters or fewer.");
  const pattern = term ? `%${term.replace(/[\\%_]/g, "\\$&")}%` : null;
  const orderMatch = /^(?:#?TA-)?(\d+)$/i.exec(term);
  const orderPattern = orderMatch ? `%${orderMatch[1]}%` : null;
  const where = `($1::text IS NULL OR r.status=$1)
    AND ($2::text IS NULL OR u.email ILIKE $2 OR o.recipient_name ILIKE $2
      OR ($3::text IS NOT NULL AND o.order_id::text LIKE $3))`;
  const joins =
    "FROM order_returns r JOIN orders o ON o.order_id=r.order_id JOIN users u ON u.user_id=r.user_id";
  const filters = [status, pattern, orderPattern];
  const rows = (
    await pool.query<ReturnCase>(
      `SELECT r.*,o.recipient_name,o.total_amount,o.payment_method,o.payment_status,o.order_status,
    o.paymongo_payment_id,u.email AS customer_email,a.state AS refund_state,a.channel AS refund_channel,
    a.is_test AS refund_is_test,COALESCE(a.reference,a.provider_refund_id) AS refund_reference,a.error_message AS refund_error
    ${joins}
    LEFT JOIN LATERAL (SELECT * FROM return_refund_attempts WHERE return_id=r.return_id
      ORDER BY created_at DESC,attempt_id DESC LIMIT 1) a ON TRUE
    WHERE ${where} ORDER BY r.created_at DESC,r.return_id DESC LIMIT 20 OFFSET $4`,
      [...filters, (page - 1) * 20],
    )
  ).rows;
  const count = (
    await pool.query(
      `SELECT count(*)::integer AS total ${joins} WHERE ${where}`,
      filters,
    )
  ).rows[0].total;
  return {
    requests: rows,
    total: count,
    page,
    totalPages: Math.max(1, Math.ceil(count / 20)),
  };
}
export async function returnHistory(id: string) {
  return (
    await pool.query(
      `SELECT e.event_id,e.action,e.note,e.created_at,u.email AS actor_email
    FROM return_events e LEFT JOIN users u ON u.user_id=e.actor_id WHERE e.return_id=$1 ORDER BY e.event_id`,
      [id],
    )
  ).rows;
}
export async function reviewReturn(
  id: string,
  actorId: number,
  body: Record<string, unknown>,
) {
  const action = body.action;
  if (!["approve", "reject", "receive", "close"].includes(String(action)))
    throw new ReturnError("Invalid action.");
  const note = textField(
    body.note ?? "",
    "Customer message",
    action === "approve" || action === "reject" ? 5 : 0,
  );
  return transaction(actorId, async (client) => {
    const { order, request } = await lockCase(client, id);
    if (body.version !== request.version)
      throw new ReturnError(
        "This request changed. Refresh and try again.",
        409,
      );
    let status: ReturnCase["status"];
    let cents = request.refund_amount_cents;
    if (action === "approve" || action === "reject") {
      if (request.status !== "REQUESTED")
        throw new ReturnError(
          "Only new requests can be approved or rejected.",
          409,
        );
      if (action === "approve") {
        if (!allowedRequest(order, request.kind))
          throw new ReturnError("The order is no longer eligible.", 409);
        cents = toCents(body.amount);
        if (
          cents > toCents(String(order.total_amount)) ||
          (cents > 0 && order.payment_status !== "paid") ||
          (request.kind === "REFUND" && cents === 0)
        )
          throw new ReturnError(
            "Refund must fit the amount paid; refund-only requests require a positive amount.",
          );
        status = "APPROVED";
      } else status = "REJECTED";
    } else if (
      action === "receive" &&
      request.kind === "RETURN" &&
      request.status === "APPROVED"
    )
      status = "RECEIVED";
    else if (
      action === "close" &&
      request.kind === "RETURN" &&
      request.status === "RECEIVED" &&
      cents === 0
    )
      status = "CLOSED";
    else
      throw new ReturnError(
        "That action is not available for this request.",
        409,
      );
    const updated = (
      await client.query<ReturnCase>(
        `UPDATE order_returns SET status=$2,refund_amount_cents=$3,
      customer_message=$4,version=version+1,updated_at=now() WHERE return_id=$1 RETURNING *`,
        [id, status, cents, note],
      )
    ).rows[0];
    await event(client, updated, actorId, status, note);
    await notify(client, updated, `Request ${status.toLowerCase()}`);
    return updated;
  });
}
export async function linkPayment(
  id: string,
  paymentId: string,
  actorId: number,
) {
  const found = (
    await pool.query<Order>(
      `SELECT o.* FROM orders o JOIN order_returns r ON r.order_id=o.order_id WHERE r.return_id=$1`,
      [id],
    )
  ).rows[0];
  if (!found) throw new ReturnError("Request not found.", 404);
  validatePayment(await getPayment(paymentId), found);
  return transaction(actorId, async (client) => {
    const { order, request } = await lockCase(client, id);
    if (isCod(order.payment_method) || order.payment_status !== "paid")
      throw new ReturnError("Only paid online orders can be linked.", 409);
    if (order.paymongo_payment_id && order.paymongo_payment_id !== paymentId)
      throw new ReturnError("A payment is already linked to this order.", 409);
    if (
      order.total_amount !== found.total_amount ||
      order.paymongo_source_id !== found.paymongo_source_id
    )
      throw new ReturnError(
        "Order payment changed. Refresh and try again.",
        409,
      );
    const active = (
      await client.query(
        "SELECT 1 FROM return_refund_attempts WHERE return_id=$1 AND state <> 'FAILED'",
        [id],
      )
    ).rows[0];
    if (active)
      throw new ReturnError(
        "A refund attempt already exists. Check its status instead.",
        409,
      );
    await client.query(
      "UPDATE orders SET paymongo_payment_id=$2 WHERE order_id=$1",
      [order.order_id, paymentId],
    );
    await event(client, request, actorId, "PAYMENT_LINKED", paymentId);
  });
}
async function finishAttempt(
  attempt: Attempt,
  actorId: number,
  state: string,
  providerId: string | null,
  error = "",
) {
  return transaction(undefined, async (client) => {
    const { request } = await lockCase(client, attempt.return_id);
    const current = (
      await client.query<Attempt>(
        "SELECT * FROM return_refund_attempts WHERE attempt_id=$1 FOR UPDATE",
        [attempt.attempt_id],
      )
    ).rows[0];
    if (current.state === "SUCCEEDED" || current.state === "FAILED") return;
    if (
      current.state === state &&
      current.provider_refund_id === providerId &&
      state !== "PROCESSING"
    )
      return;
    await client.query(
      `UPDATE return_refund_attempts SET state=$2,provider_refund_id=COALESCE($3,provider_refund_id),
      error_message=$4,updated_at=now() WHERE attempt_id=$1`,
      [attempt.attempt_id, state, providerId, error || null],
    );
    const updated = (
      await client.query<ReturnCase>(
        `UPDATE order_returns SET
      status=CASE WHEN $2='SUCCEEDED' THEN 'REFUNDED' ELSE status END,
      version=version+1,updated_at=now() WHERE return_id=$1 RETURNING *`,
        [request.return_id, state],
      )
    ).rows[0];
    await event(client, updated, actorId, `REFUND_${state}`, error);
    if (state === "SUCCEEDED")
      await notify(client, updated, "Refund completed");
    else if (state === "PENDING")
      await notify(client, updated, "Refund processing");
  });
}
export async function issueRefund(
  id: string,
  actorId: number,
  body: Record<string, unknown>,
) {
  const claimed = await transaction(actorId, async (client) => {
    const { order, request } = await lockCase(client, id);
    if (body.version !== request.version)
      throw new ReturnError(
        "This request changed. Refresh and try again.",
        409,
      );
    if (
      !(
        (request.kind === "REFUND" && request.status === "APPROVED") ||
        (request.kind === "RETURN" && request.status === "RECEIVED")
      ) ||
      request.refund_amount_cents <= 0 ||
      order.payment_status !== "paid"
    )
      throw new ReturnError(
        "Approve the refund and receive returned items first where required.",
        409,
      );
    const active = (
      await client.query(
        "SELECT 1 FROM return_refund_attempts WHERE return_id=$1 AND state <> 'FAILED'",
        [id],
      )
    ).rows[0];
    if (active)
      throw new ReturnError(
        "A refund is already processing, unresolved, or completed. Check status instead.",
        409,
      );
    const cod = isCod(order.payment_method);
    let reference: string | null = null;
    let channel = "paymongo";
    if (cod) {
      if (
        body.confirmSent !== true ||
        !["bank", "ewallet", "cash"].includes(String(body.channel))
      )
        throw new ReturnError(
          "Confirm the COD refund was sent and select its method.",
        );
      reference = textField(body.reference, "Transfer reference", 3, 150);
      channel = String(body.channel);
    } else {
      if (body.confirmRefund !== true)
        throw new ReturnError(
          "Confirm the approved test refund before issuing it.",
        );
      if (!order.paymongo_payment_id)
        throw new ReturnError(
          "Link the verified PayMongo payment ID first.",
          409,
        );
    }
    const attempt = (
      await client.query<Attempt>(
        `INSERT INTO return_refund_attempts(return_id,actor_id,amount_cents,channel,payment_id,reference,is_test)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          id,
          actorId,
          request.refund_amount_cents,
          channel,
          order.paymongo_payment_id,
          reference,
          !cod,
        ],
      )
    ).rows[0];
    await client.query(
      "UPDATE order_returns SET version=version+1,updated_at=now() WHERE return_id=$1",
      [id],
    );
    await event(client, request, actorId, "REFUND_STARTED");
    if (cod) {
      // Recording a completed manual transfer is entirely local and atomic.
      await client.query(
        "UPDATE return_refund_attempts SET state='SUCCEEDED',updated_at=now() WHERE attempt_id=$1",
        [attempt.attempt_id],
      );
      const completed = (
        await client.query<ReturnCase>(
          "UPDATE order_returns SET status='REFUNDED' WHERE return_id=$1 RETURNING *",
          [id],
        )
      ).rows[0];
      await event(
        client,
        completed,
        actorId,
        "REFUND_SUCCEEDED",
        `Manual ${channel} refund recorded: ${reference}`,
      );
      await notify(client, completed, "Refund completed");
    }
    return { attempt, order, cod };
  });
  if (claimed.cod) return;
  let postStarted = false;
  try {
    const payment = validatePayment(
      await getPayment(claimed.attempt.payment_id!),
      claimed.order,
    );
    // Validate the available amount before sending money-moving POST.
    const reserved = payment.attributes
      .refunds!.filter((r) => r.attributes.status !== "failed")
      .reduce((sum, r) => sum + r.attributes.amount, 0);
    if (
      !Number.isSafeInteger(reserved) ||
      claimed.attempt.amount_cents > payment.attributes.amount - reserved
    )
      throw new ReturnError(
        "Refund exceeds the payment's remaining refundable amount.",
        409,
      );
    postStarted = true;
    const outcome = await createRefund(
      payment,
      claimed.attempt.amount_cents,
      claimed.attempt.attempt_id,
    );
    await finishAttempt(
      claimed.attempt,
      actorId,
      outcome.state,
      outcome.id,
      outcome.state === "FAILED" ? "PayMongo confirmed the refund failed." : "",
    );
  } catch (error) {
    // No lease/retry can re-send an uncertain POST. Reconciliation is GET-only.
    const state =
      !postStarted || (error instanceof RefundProviderError && error.definitive)
        ? "FAILED"
        : "UNKNOWN";
    await finishAttempt(
      claimed.attempt,
      actorId,
      state,
      null,
      error instanceof ReturnError
        ? error.message
        : "Refund outcome requires verification.",
    );
  }
}
export async function reconcileRefund(id: string, actorId: number) {
  const result = await transaction(actorId, async (client) => {
    const { order, request } = await lockCase(client, id);
    const attempt = (
      await client.query<Attempt>(
        `SELECT * FROM return_refund_attempts WHERE return_id=$1 AND state <> 'FAILED'
      ORDER BY created_at DESC LIMIT 1`,
        [id],
      )
    ).rows[0];
    if (!attempt || attempt.channel !== "paymongo")
      throw new ReturnError("No unresolved online refund to check.", 409);
    if (request.status === "REFUNDED") return null;
    return { order, attempt };
  });
  if (!result) return;
  const payment = validatePayment(
    await getPayment(result.attempt.payment_id!),
    result.order,
  );
  const outcome = await checkRefund(
    payment,
    result.attempt.amount_cents,
    result.attempt.attempt_id,
    result.attempt.provider_refund_id,
  );
  if (outcome)
    await finishAttempt(
      result.attempt,
      actorId,
      outcome.state,
      outcome.id,
      outcome.state === "FAILED" ? "PayMongo confirmed the refund failed." : "",
    );
  else
    throw new ReturnError(
      "No matching refund found yet. Do not issue another refund; verify this attempt in PayMongo.",
      409,
    );
}
