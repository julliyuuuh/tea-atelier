import crypto from "crypto";

export function verifyPaymongoSignature(rawBody: string, header: string | null, secret: string) {
  if (!header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("="))
  ) as { t: string; te: string; li: string };

  const signedPayload = `${parts.t}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  const sig = process.env.NODE_ENV === "production" ? parts.li : parts.te;

  if (!sig) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false; // lengths mismatched, definitely not equal
  }
}