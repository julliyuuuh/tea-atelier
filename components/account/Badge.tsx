"use client";

type BadgeTone = "sage" | "amber" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  sage: "bg-sage/15 text-sage",
  amber: "bg-charcoal/10 text-charcoal/70",
  neutral: "bg-sand/40 text-charcoal/60",
};

export default function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-body text-xs uppercase tracking-wide px-3 py-1 rounded-full ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}