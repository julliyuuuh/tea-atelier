import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import { MarketingError } from "@/lib/marketing";
import { AuditError } from "@/lib/admin-audit";
export async function campaignAdmin(
  req: Request,
): Promise<
  | { error: NextResponse; actorId?: never; email?: never }
  | { error?: undefined; actorId: number; email: string }
> {
  const auth = await requireAdmin(req);
  if (auth.error) return auth;
  const user = (
    await pool.query(
      "SELECT email FROM users WHERE user_id=$1 AND is_suspended=false",
      [auth.decoded.userId],
    )
  ).rows[0];
  if (!user)
    return {
      error: NextResponse.json(
        { error: "Active admin access required." },
        { status: 403 },
      ),
    };
  return { actorId: auth.decoded.userId, email: user.email as string };
}
export function marketingResponseError(error: unknown) {
  const known = error instanceof MarketingError || error instanceof AuditError;
  return NextResponse.json(
    {
      error: known ? error.message : "Unable to complete the campaign action.",
    },
    { status: known ? error.status : 500 },
  );
}
