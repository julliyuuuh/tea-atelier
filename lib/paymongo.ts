// lib/paymongo.ts
import crypto from "crypto";

export function verifyPaymongoSignature(rawBody: string, header: string | null, secret: string) {
  if (!header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("="))
  ) as { t: string; te: string; li: string };

  const signedPayload = `${parts.t}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  // Pick the signature based on which key you're using, not NODE_ENV
  const isTestMode = (process.env.PAYMONGO_SECRET_KEY || "").startsWith("sk_test_");
  const sig = isTestMode ? parts.te : parts.li;

  if (!sig) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}