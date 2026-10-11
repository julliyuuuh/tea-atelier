export const CONTACT_FIELDS = [
  { key: "eyebrow", label: "Small heading", max: 80 },
  { key: "heading", label: "Page heading", max: 160 },
  { key: "intro", label: "Introduction", max: 1500, multiline: true },
  { key: "loginHeading", label: "Sign-in prompt heading", max: 160 },
  {
    key: "loginBody",
    label: "Sign-in prompt text",
    max: 1500,
    multiline: true,
  },
  { key: "successHeading", label: "Confirmation heading", max: 160 },
  {
    key: "successBody",
    label: "Confirmation text",
    max: 1500,
    multiline: true,
  },
] as const;
export type ContactContent = Record<
  (typeof CONTACT_FIELDS)[number]["key"],
  string
>;
export const DEFAULT_CONTACT_CONTENT: ContactContent = {
  eyebrow: "Get in Touch",
  heading: "Contact Us",
  intro:
    "Questions, feedback, or just want to talk tea? We'd love to hear from you.",
  loginHeading: "Log in to send a message",
  loginBody:
    "Create an account or sign in so we can get back to you and you can track your messages.",
  successHeading: "Message sent",
  successBody:
    "We'll get back to you within 1-2 business days. You can track this message from your account page.",
};
export function contactContentError(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return "Enter valid contact page content.";
  const content = value as Record<string, unknown>;
  if (
    Object.keys(content).some(
      (key) => !CONTACT_FIELDS.some((field) => field.key === key),
    )
  )
    return "Only contact page text can be changed here.";
  for (const field of CONTACT_FIELDS) {
    const text = content[field.key];
    if (
      typeof text !== "string" ||
      !text.trim() ||
      text.trim().length > field.max
    )
      return `${field.label} must contain 1 to ${field.max} characters.`;
  }
  return null;
}
export function normalizeContactContent(value: ContactContent): ContactContent {
  return Object.fromEntries(
    CONTACT_FIELDS.map((field) => [field.key, value[field.key].trim()]),
  ) as ContactContent;
}
