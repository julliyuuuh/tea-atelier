export type CampaignInput = {
  title: string;
  subject: string;
  heading: string;
  message: string;
  imageUrl: string;
  imageAlt: string;
  ctaLabel: string;
  ctaPath: string;
};
export type Campaign = CampaignInput & {
  id: string;
  status: "DRAFT" | "QUEUED" | "COMPLETED";
  version: number;
  createdAt: string;
  counts: Record<
    "pending" | "sending" | "sent" | "failed" | "unknown" | "skipped",
    number
  >;
};
export class MarketingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function uuid(value: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new MarketingError("Invalid record ID.");
  return value;
}
export function parseCampaign(
  value: unknown,
  cloudName: string | undefined,
): CampaignInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new MarketingError("Invalid campaign.");
  const body = value as Record<string, unknown>;
  function text(key: string, max: number, min = 0) {
    if (typeof body[key] !== "string")
      throw new MarketingError(`Invalid ${key}.`);
    const result = body[key].trim();
    if (result.length < min || result.length > max)
      throw new MarketingError(`${key} must be ${min}–${max} characters.`);
    return result;
  }
  const input = {
    title: text("title", 100, 1),
    subject: text("subject", 150, 1),
    heading: text("heading", 150, 1),
    message: text("message", 5000, 10),
    imageUrl: text("imageUrl", 2000),
    imageAlt: text("imageAlt", 160),
    ctaLabel: text("ctaLabel", 60),
    ctaPath: text("ctaPath", 300),
  };
  if (/[\r\n]/.test(input.subject))
    throw new MarketingError("Subject must be one line.");
  if (input.imageUrl) {
    let url: URL;
    try {
      url = new URL(input.imageUrl);
    } catch {
      throw new MarketingError("Invalid image URL.");
    }
    if (
      !cloudName ||
      url.protocol !== "https:" ||
      url.hostname !== "res.cloudinary.com" ||
      !url.pathname.startsWith(`/${cloudName}/image/upload/`) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new MarketingError(
        "Use an image uploaded to your Cloudinary account.",
      );
    input.imageAlt ||= input.heading;
  }
  if (input.ctaPath) {
    if (
      !input.ctaPath.startsWith("/") ||
      input.ctaPath.startsWith("//") ||
      /[\\\s]/.test(input.ctaPath) ||
      new URL(input.ctaPath, "https://example.com").origin !==
        "https://example.com"
    )
      throw new MarketingError(
        "Button link must be a path on your site, such as /shop.",
      );
    if (!input.ctaLabel)
      throw new MarketingError("Add a button label or remove the link.");
  } else input.ctaLabel = "";
  return input;
}
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function campaignEmail(
  input: CampaignInput,
  siteUrl: string,
  unsubscribeUrl: string | null,
) {
  const e = escapeHtml;
  const buttonUrl = input.ctaPath
    ? new URL(input.ctaPath, siteUrl).toString()
    : "";
  const html = `<div style="max-width:600px;margin:auto;background:#fdf6ed;color:#1f2621;padding:32px;font-family:Arial,sans-serif"><p style="color:#778873;letter-spacing:2px">TEA ATELIER</p>${input.imageUrl ? `<img src="${e(input.imageUrl)}" alt="${e(input.imageAlt)}" style="display:block;max-width:100%;height:auto;border-radius:12px"/>` : ""}<h1 style="font-family:Georgia,serif;font-weight:400">${e(input.heading)}</h1><p style="white-space:pre-wrap;line-height:1.7">${e(input.message)}</p>${buttonUrl ? `<p><a href="${e(buttonUrl)}" style="display:inline-block;padding:12px 24px;border-radius:24px;background:#778873;color:white;text-decoration:none">${e(input.ctaLabel)}</a></p>` : ""}<p style="margin-top:32px;font-size:12px;color:#666">${unsubscribeUrl ? `You opted in to Tea Atelier promotional emails. <a href="${e(unsubscribeUrl)}">Unsubscribe</a>. Order emails remain enabled.` : "Test preview, this email does not subscribe you or send to customers."}</p></div>`;
  return {
    html,
    text: `Tea Atelier\n\n${input.heading}\n\n${input.message}${buttonUrl ? `\n\n${input.ctaLabel}: ${buttonUrl}` : ""}\n\n${unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}\nOrder emails remain enabled.` : "Test preview only."}`,
  };
}
