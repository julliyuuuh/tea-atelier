import { notFound } from "next/navigation";
import { ANDROID_PACKAGE, androidReturnUrls } from "@/lib/android-app-links";

export default async function AndroidPaymentReturn({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ payment?: string | string[] }>;
}) {
  const { orderId } = await params;
  if (!/^[1-9]\d*$/.test(orderId) || !Number.isSafeInteger(Number(orderId)))
    notFound();
  const { payment } = await searchParams;
  const urls = androidReturnUrls(Number(orderId));
  const returnUrl = payment === "failed" ? urls.failed : urls.success;
  // Explicit package targeting also offers a user-initiated fallback when
  // a browser keeps the HTTPS return open instead of following the App Link.
  const intent = `intent://${returnUrl.slice("https://".length)}#Intent;scheme=https;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(returnUrl)};end`;
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="max-w-md text-center space-y-5">
        <h1 className="text-3xl font-semibold">Return to Tea Atelier</h1>
        <p>Open the app to check the payment status of order #{orderId}.</p>
        <a
          href={intent}
          className="inline-block rounded-full bg-[#5a7a52] px-6 py-3 text-white"
        >
          Open Tea Atelier
        </a>
        <p className="text-sm">
          If the app does not open, open Tea Atelier from your phone and check
          Orders. You can also close the payment browser to return to the app.
        </p>
        <p className="text-sm">
          This page does not confirm payment. The app checks your order
          securely.
        </p>
      </section>
    </main>
  );
}
