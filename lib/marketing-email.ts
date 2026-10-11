import { Resend } from "resend";
import {
  MarketingError,
  campaignEmail,
  type CampaignInput,
} from "@/lib/marketing";
export function marketingEmailConfig() {
  const { RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_SITE_URL } = process.env;
  if (!RESEND_API_KEY || !EMAIL_FROM || !NEXT_PUBLIC_SITE_URL)
    throw new MarketingError("Email settings are missing on the server.", 503);
  const url = new URL(NEXT_PUBLIC_SITE_URL);
  if (url.protocol !== "https:")
    throw new MarketingError("Campaigns require an HTTPS site URL.", 503);
  return { siteUrl: url.origin, sendFrom: `Tea Atelier <${EMAIL_FROM}>` };
}
export async function sendCampaignEmail(
  input: CampaignInput,
  to: string,
  config: { siteUrl: string; sendFrom: string },
  token: string | null,
  key: string,
) {
  const unsubscribeUrl = token
    ? new URL(`/unsubscribe?token=${token}`, config.siteUrl).toString()
    : null;
  const oneClickUrl = token
    ? new URL(
        `/api/marketing/unsubscribe?token=${token}`,
        config.siteUrl,
      ).toString()
    : null;
  const content = campaignEmail(input, config.siteUrl, unsubscribeUrl);
  try {
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send(
      {
        from: config.sendFrom,
        to,
        subject: token ? input.subject : `[TEST] ${input.subject}`,
        ...content,
        ...(oneClickUrl
          ? {
              headers: {
                "List-Unsubscribe": `<${oneClickUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }
          : {}),
      },
      { idempotencyKey: key },
    );
    if (result.error) {
      // Only explicit rejection is safe to retry indefinitely. Timeouts/5xx can
      // mean acceptance without acknowledgement and must keep the same key.
      const rejected = [
        "validation_error",
        "invalid_access",
        "missing_api_key",
        "invalid_api_key",
        "rate_limit_exceeded",
      ].includes(result.error.name);
      return {
        state: rejected ? "FAILED" : "UNKNOWN",
        providerId: null,
      } as const;
    }
    return result.data?.id
      ? ({ state: "SENT", providerId: result.data.id } as const)
      : ({ state: "UNKNOWN", providerId: null } as const);
  } catch {
    return { state: "UNKNOWN", providerId: null } as const;
  }
}
