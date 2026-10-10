import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { deliverNotificationEmails } from "@/lib/notification-emails";

export async function POST(req: Request) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  try {
    return NextResponse.json(await deliverNotificationEmails());
  } catch {
    return NextResponse.json(
      { error: "Unable to retry notification emails." },
      { status: 500 },
    );
  }
}
