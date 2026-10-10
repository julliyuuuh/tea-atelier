import crypto from "node:crypto";

export function verifyPaymongoSignature(
  rawBody: string,
  header: string | null,
  secret: string,
) {
  if (!header || !secret) return false;
  const parts: Record<string, string> = {};
  for (const part of header.split(",")) {
    const match = /^\s*(t|te|li)=([^=]+?)\s*$/.exec(part);
    if (!match || parts[match[1]]) return false;
    parts[match[1]] = match[2];
  }
  const timestamp = Number(parts.t);
  if (
    !/^\d+$/.test(parts.t ?? "") ||
    !Number.isSafeInteger(timestamp) ||
    Math.abs(Date.now() / 1000 - timestamp) > 300
  )
    return false;
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key?.startsWith("sk_test_") && !key?.startsWith("sk_live_"))
    return false;
  const signature = key.startsWith("sk_test_") ? parts.te : parts.li;
  if (!/^[a-fA-F0-9]{64}$/.test(signature ?? "")) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parts.t}.${rawBody}`)
    .digest();
  return crypto.timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
