import { NextResponse } from "next/server";
import { campaignAdmin, marketingResponseError } from "@/lib/marketing-api";
import {
  campaignSummary,
  saveCampaign,
  subscriberCount,
} from "@/lib/marketing-store";
import { MarketingError, parseCampaign } from "@/lib/marketing";
import { pool } from "@/lib/db";
export async function GET(req: Request) {
  try {
    const auth = await campaignAdmin(req);
    if (auth.error) return auth.error;
    const page = Number(new URL(req.url).searchParams.get("page") || 1);
    if (!Number.isInteger(page) || page < 1 || page > 10000)
      throw new MarketingError("Invalid page.");
    const [campaigns, subscribers, total] = await Promise.all([
      campaignSummary(undefined, page),
      subscriberCount(),
      pool.query("SELECT COUNT(*) FROM marketing_campaigns"),
    ]);
    return NextResponse.json({
      campaigns,
      subscribers,
      page,
      totalPages: Math.max(1, Math.ceil(Number(total.rows[0].count) / 10)),
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
