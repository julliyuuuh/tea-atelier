import { pool } from "@/lib/db";
import { sendOrderStatusEmail } from "@/lib/orders-notification-email";

// Claim with a lease so concurrent updates/retries cannot send the same alert.
// Provider idempotency also protects a retry after a successful send whose
// response was lost. Run the admin retry endpoint for failed/pending emails.
export async function deliverNotificationEmails(orderId?: number) {
  const { rows } = await pool.query(
    `WITH batch AS (
       SELECT notification_id FROM notifications
       WHERE ($1::integer IS NULL OR order_id = $1)
         AND (email_state IN ('pending', 'failed') OR
              (email_state = 'sending' AND email_claimed_at < now() - interval '5 minutes'))
       ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED
     ) UPDATE notifications n SET email_state = 'sending', email_claimed_at = now(),
         email_attempts = email_attempts + 1
       FROM batch WHERE n.notification_id = batch.notification_id
       RETURNING n.notification_id, n.user_id, n.order_id, n.status`,
    [orderId ?? null],
  );
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const user = await pool.query(
        "SELECT email FROM users WHERE user_id = $1",
        [row.user_id],
      );
      if (!user.rows[0]?.email)
        throw new Error("No recipient email for notification.");
      if (row.status !== "DELIVERED" && row.status !== "CANCELLED")
        throw new Error("Invalid email notification status.");
      await sendOrderStatusEmail(
        user.rows[0].email,
        row.order_id,
        row.status,
        row.notification_id,
      );
      await pool.query(
        "UPDATE notifications SET email_state = 'sent', emailed_at = now() WHERE notification_id = $1",
        [row.notification_id],
      );
      sent++;
    } catch {
      await pool.query(
        "UPDATE notifications SET email_state = 'failed' WHERE notification_id = $1",
        [row.notification_id],
      );
      failed++;
    }
  }
  return { sent, failed };
}

export async function deliverOrderNotificationEmails(orderId: number) {
  try {
    return await deliverNotificationEmails(orderId);
  } catch {
    // The order transaction has committed; an email failure must not change
    // the checkout/status response or discard the queued notification.
    console.error(
      `Notification email dispatch failed for order ${orderId}; retry is available.`,
    );
    return { sent: 0, failed: 1 };
  }
}
