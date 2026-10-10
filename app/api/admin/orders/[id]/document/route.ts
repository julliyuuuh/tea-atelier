import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { requireAdmin } from "@/lib/require-admin";
import { orderDocumentResponse } from "@/lib/order-document-response";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser(req);
  if (user.error) return user.error;
  const { error } = await requireAdmin(req);
  if (error) return error;
  const kind = new URL(req.url).searchParams.get("type") ?? "invoice";
  if (kind !== "invoice" && kind !== "packing-slip") {
    return NextResponse.json(
      { error: "Invalid document type." },
      { status: 400 },
    );
  }
  return orderDocumentResponse((await params).id, kind);
}
