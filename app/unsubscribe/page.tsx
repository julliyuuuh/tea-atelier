import UnsubscribeForm from "./UnsubscribeForm";

// for unsubscribe page
export const metadata = {
  title: "Email preferences | Tea Atelier",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-charcoal/10 bg-white p-8">
        <p className="font-body text-xs uppercase tracking-widest text-sage">
          Tea Atelier
        </p>
        <h1 className="mt-3 font-display text-3xl text-charcoal">
          Email preferences
        </h1>
        <p className="mt-4 font-body text-sm leading-relaxed text-charcoal/70">
          Unsubscribe from promotional emails. Your order confirmations and
          order updates will stay enabled.
        </p>
        <UnsubscribeForm token={token || ""} />
      </section>
    </main>
  );
}
