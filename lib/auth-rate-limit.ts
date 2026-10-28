import { createHmac, randomInt } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

type Action = "login" | "google" | "forgot" | "signup" | "reset" | "verification";
const policies: Record<Action, { account: number; client: number; seconds: number }> = {
  login: { account: 15, client: 60, seconds: 900 },
  google: { account: 30, client: 60, seconds: 900 },
  forgot: { account: 3, client: 10, seconds: 900 },
  signup: { account: 3, client: 10, seconds: 900 },
  reset: { account: 10, client: 30, seconds: 900 },
  verification: { account: 3, client: 10, seconds: 900 },
};

export function normalizeAuthEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

// Only opt into a header after verifying that the hosting ingress overwrites it.
// Arbitrary X-Forwarded-For / CF-Connecting-IP headers are not trusted by default.
export function authClientKey(req: Request): string {
  const header = process.env.AUTH_TRUSTED_IP_HEADER?.toLowerCase();
  const value = header ? req.headers.get(header)?.trim() : undefined;
  return value && isIP(value) ? value : "shared-ingress";
}

async function consume(action: Action, scope: string, identity: string, limit: number) {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("Missing authentication configuration");
    const key = createHmac("sha256", secret)
      .update(JSON.stringify(["auth-rate-v1", action, scope, identity]))
      .digest("hex");
    const { rows } = await pool.query(
      `INSERT INTO auth_rate_limits AS counters (bucket_key, attempts, expires_at)
       VALUES ($1, 1, statement_timestamp() + $3 * interval '1 second')
       ON CONFLICT (bucket_key) DO UPDATE SET
         attempts = CASE WHEN counters.expires_at <= statement_timestamp() THEN 1
                         ELSE LEAST(counters.attempts + 1, $2 + 1) END,
         expires_at = CASE WHEN counters.expires_at <= statement_timestamp()
                           THEN statement_timestamp() + $3 * interval '1 second'
                           ELSE counters.expires_at END
       RETURNING attempts, GREATEST(1, CEIL(EXTRACT(EPOCH FROM
         (expires_at - statement_timestamp()))))::integer AS retry_after`,
      [key, limit, policies[action].seconds],
    );
    // Bound retained counter data without a separate cron/service.
    if (randomInt(100) === 0) {
      await pool.query(`DELETE FROM auth_rate_limits WHERE bucket_key IN (
        SELECT bucket_key FROM auth_rate_limits
        WHERE expires_at < statement_timestamp() - interval '1 day'
        ORDER BY expires_at LIMIT 200)`);
    }
    if (Number(rows[0].attempts) > limit) {
      const retryAfter = Number(rows[0].retry_after);
      return NextResponse.json(
        { error: `Too many attempts. Please try again in ${Math.ceil(retryAfter / 60)} minute(s).`, retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
      );
    }
    return null;
  } catch {
    // Never silently disable protection when the table/store is unavailable.
    console.error("Authentication rate-limit store unavailable.");
    return NextResponse.json(
      { error: "Sign-in services are temporarily unavailable. Please try again shortly." },
      { status: 503, headers: { "Retry-After": "30", "Cache-Control": "no-store" } },
    );
  }
}

export function limitAuthRequest(req: Request, action: Action) {
  const client = authClientKey(req);
  // Without a verified ingress header, use a generous shared abuse ceiling;
  // account limits still apply independently and cannot be spoofed by headers.
  return consume(action, "client", client, client === "shared-ingress" ? 300 : policies[action].client);
}

export function limitAuthAccount(action: Action, identity: string) {
  return consume(action, "account", identity.trim().toLowerCase(), policies[action].account);
}
