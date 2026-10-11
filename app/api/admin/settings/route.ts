import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { requireSuperAdmin } from "@/lib/require-admin";
import { readSettings, saveSettings } from "@/lib/store-settings-server";
import { SettingsError } from "@/lib/store-settings";
import { AuditError } from "@/lib/admin-audit";
async function access(req: Request) {
  const user = await requireUser(req);
  if (user.error) return user;
  return requireSuperAdmin(req);
}
function failure(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof SettingsError || error instanceof AuditError
          ? error.message
          : "Unable to save or load settings.",
    },
    {
      status:
        error instanceof SettingsError || error instanceof AuditError
          ? error.status
          : 500,
    },
  );
}
export async function GET(req: Request) {
  const auth = await access(req);
  if (auth.error) return auth.error;
  try {
    return NextResponse.json(await readSettings(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(req: Request) {
  const auth = await access(req);
  if (auth.error) return auth.error;
  if (!("decoded" in auth) || !auth.decoded)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(
      await saveSettings(
        auth.decoded.userId,
        await req.json().catch(() => null),
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
