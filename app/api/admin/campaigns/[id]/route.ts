import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { campaignAdmin, marketingResponseError } from "@/lib/marketing-api";
import {
  campaignSummary,
  saveCampaign,
  queueCampaign,
  deliverCampaignBatch,
} from "@/lib/marketing-store";
import { MarketingError, parseCampaign, uuid } from "@/lib/marketing";
import { marketingEmailConfig, sendCampaignEmail } from "@/lib/marketing-email";
export const maxDuration = 30;
type Context = { params: Promise<{ id: string }> };
export async function PATCH(req: Request, context: Context) {
  try {
    const auth = await campaignAdmin(req);
    if (auth.error) return auth.error;
    const id = uuid((await context.params).id),
      body = await req.json();
    if (!Number.isInteger(body.version) || body.version < 1)
      throw new MarketingError("Invalid draft version.");
    return NextResponse.json({
      campaign: await saveCampaign(
        auth.actorId!,
        parseCampaign(body, process.env.CLOUDINARY_CLOUD_NAME),
        id,
        body.version,
      ),
    });
  } catch (error) {
    return marketingResponseError(error);
  }
}
export async function POST(req: Request, context: Context) {
  try {
    const auth = await campaignAdmin(req);
    if (auth.error) return auth.error;
    const id = uuid((await context.params).id),
      body = await req.json();
    if (body.action === "queue") {
      if (body.confirm !== true || !Number.isInteger(body.version))
        throw new MarketingError(
          "Review and confirm this saved draft before sending.",
        );
      return NextResponse.json({
        campaign: await queueCampaign(auth.actorId!, id, body.version),
      });
    }
    if (body.action === "deliver")
      return NextResponse.json(await deliverCampaignBatch(id));
    if (body.action === "test") {
      if (!auth.email)
        throw new MarketingError("Your admin account has no email address.");
      const campaign = (await campaignSummary(id))[0];
      if (!campaign) throw new MarketingError("Campaign not found.", 404);
      const result = await sendCampaignEmail(
        campaign,
        auth.email,
        marketingEmailConfig(),
        null,
        `campaign-test/${id}/${randomUUID()}`,
      );
      if (result.state !== "SENT")
        throw new MarketingError(
          "The test send could not be confirmed. Check your email provider before trying again.",
          502,
        );
      return NextResponse.json({
        message: "Test email sent to your admin email address.",
      });
    }
    throw new MarketingError("Invalid campaign action.");
  } catch (error) {
    return marketingResponseError(error);
  }
}
