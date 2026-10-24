import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { salesDates, loadSales, salesDocument } from "@/lib/admin-sales";
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  let range;
  const url = new URL(req.url);
  try {
    range = salesDates(url);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid dates." },
      { status: 400 },
    );
  }
  try {
    const data = await loadSales(range.from, range.to);
    const headers = { "Cache-Control": "private, no-store" };
    if (url.searchParams.get("format") === "print")
      return new Response(salesDocument(data), {
        headers: {
          ...headers,
          "Content-Type": "text/html; charset=utf-8",
          "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
          "X-Content-Type-Options": "nosniff",
        },
      });
    return NextResponse.json(data, { headers });
  } catch {
    return NextResponse.json(
      { error: "Unable to load sales report." },
      { status: 500 },
    );
  }
}
