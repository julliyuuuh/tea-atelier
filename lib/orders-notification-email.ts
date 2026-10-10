import { Resend } from "resend";

export async function sendOrderStatusEmail(
  to: string,
  orderId: number,
  status: "DELIVERED" | "CANCELLED",
  notificationId: string,
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !siteUrl) {
    throw new Error(
      "Order emails require RESEND_API_KEY, EMAIL_FROM and NEXT_PUBLIC_SITE_URL.",
    );
  }
  const url = new URL(`/account/orders/${orderId}`, siteUrl).toString();
  const label = status === "DELIVERED" ? "delivered" : "cancelled";
  const message =
    status === "DELIVERED"
      ? "Your order has been delivered. We hope you enjoy your tea!"
      : "Your order has been cancelled. View the order details or contact us if you need help.";
  const escapedUrl = url
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send(
    {
      from: `Tea Atelier <${process.env.EMAIL_FROM}>`,
      to,
      subject: `Your Tea Atelier order #TA-${orderId} has been ${label}`,
      text: `${message}\n\nOrder #TA-${orderId}\n${url}`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto"><h2>Order #TA-${orderId} ${label}</h2><p>${message}</p><a href="${escapedUrl}">View your order</a></div>`,
    },
    { idempotencyKey: `order-notification/${notificationId}` },
  );
  if (error) throw new Error(error.message);
}
