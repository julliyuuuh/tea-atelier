import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { requireSuperAdmin } from "@/lib/require-admin";
import { listAudit, AuditError } from "@/lib/admin-audit";
export async function GET(req: Request) {
  const user = await requireUser(req);
  if (user.error) return user.error;
  const auth = await requireSuperAdmin(req);
  if (auth.error) return auth.error;
  try {
    return NextResponse.json(await listAudit(new URL(req.url)), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof AuditError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error("Unable to load admin audit history.");
    return NextResponse.json(
      { error: "Unable to load audit history." },
      { status: 500 },
    );
  }
}
