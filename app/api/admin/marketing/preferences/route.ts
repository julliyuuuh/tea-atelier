import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { marketingPreference } from "@/lib/marketing-store";
import { MarketingError } from "@/lib/marketing";
import { marketingResponseError } from "@/lib/marketing-api";
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  try {
    return NextResponse.json(await marketingPreference(auth.userId!));
  } catch (error) {
    return marketingResponseError(error);
  }
}
export async function PUT(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    if (typeof body?.subscribed !== "boolean")
      throw new MarketingError("Choose whether to subscribe.");
    return NextResponse.json(
      await marketingPreference(auth.userId!, body.subscribed),
    );
  } catch (error) {
    return marketingResponseError(error);
  }
}
