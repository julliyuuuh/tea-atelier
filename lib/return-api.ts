import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { requireAdmin } from "@/lib/require-admin";
import { ReturnError } from "@/lib/returns";
export async function returnAdmin(
  req: Request,
): Promise<{ error?: Response; userId?: number }> {
  const user = await requireUser(req);
  if (user.error) return user;
  const admin = await requireAdmin(req);
  if (admin.error) return { error: admin.error };
  return { userId: user.userId };
}
export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new ReturnError("Invalid request body.");
  return body;
}
export const returnJson = (body: unknown) =>
  NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
  });
export function returnFailure(error: unknown) {
  if (error instanceof ReturnError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  console.error("Return request operation failed.");
  return NextResponse.json(
    { error: "Unable to update this request. Refresh and try again." },
    { status: 500 },
  );
}
