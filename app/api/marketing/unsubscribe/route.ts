import { NextResponse } from "next/server";
import { uuid } from "@/lib/marketing";
import { unsubscribeMarketing } from "@/lib/marketing-store";
import { marketingResponseError } from "@/lib/marketing-api";
// GET never changes consent: link scanners may follow email links automatically.
export async function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.redirect(
    new URL(
      `/unsubscribe?token=${encodeURIComponent(url.searchParams.get("token") || "")}`,
      url.origin,
    ),
  );
}
export async function POST(req: Request) {
  try {
    const token = uuid(new URL(req.url).searchParams.get("token") || "");
    await unsubscribeMarketing(token);
    return NextResponse.json({
      message:
        "You are unsubscribed from promotional emails. Order emails remain enabled.",
    });
  } catch (error) {
    return marketingResponseError(error);
  }
}
