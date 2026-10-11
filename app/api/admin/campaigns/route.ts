import { NextResponse } from "next/server";
import { campaignAdmin, marketingResponseError } from "@/lib/marketing-api";
import {
  campaignSummary,
  campaignCount,
  saveCampaign,
  subscriberCount,
} from "@/lib/marketing-store";
import { MarketingError, parseCampaign } from "@/lib/marketing";
export async function GET(req: Request) {
  try {
    const auth = await campaignAdmin(req);
    if (auth.error) return auth.error;
    const params = new URL(req.url).searchParams;
    const page = Number(params.get("page") || 1);
    if (!Number.isInteger(page) || page < 1 || page > 10000)
      throw new MarketingError("Invalid page.");
    const search = (params.get("q") || "").trim();
    const status = params.get("status") || "";
    if (
      search.length > 150 ||
      !["", "DRAFT", "QUEUED", "COMPLETED"].includes(status)
    )
      throw new MarketingError("Invalid campaign filter.");
    const [campaigns, subscribers, total] = await Promise.all([
      campaignSummary(undefined, page, search, status),
      subscriberCount(),
      campaignCount(search, status),
    ]);
    return NextResponse.json({
      campaigns,
      subscribers,
      page,
      total,
      totalPages: Math.max(1, Math.ceil(total / 10)),
    });
  } catch (error) {
    return marketingResponseError(error);
  }
}
export async function POST(req: Request) {
  try {
    const auth = await campaignAdmin(req);
    if (auth.error) return auth.error;
    const input = parseCampaign(
      await req.json(),
      process.env.CLOUDINARY_CLOUD_NAME,
    );
    return NextResponse.json(
      { campaign: await saveCampaign(auth.actorId!, input) },
      { status: 201 },
    );
  } catch (error) {
    return marketingResponseError(error);
  }
}
