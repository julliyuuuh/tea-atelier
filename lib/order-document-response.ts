import { NextResponse } from "next/server";
import {
  loadOrderDocument,
  renderOrderDocument,
  type DocumentKind,
} from "@/lib/order-documents";

export async function orderDocumentResponse(
  orderId: string,
  kind: DocumentKind,
  userId?: number,
) {
  if (
    !/^[1-9]\d*$/.test(orderId) ||
    !Number.isSafeInteger(Number(orderId)) ||
    Number(orderId) > 2147483647
  ) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  try {
    const data = await loadOrderDocument(Number(orderId), userId);
    if (!data)
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    return new Response(renderOrderDocument(data, kind), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      },
    });
  } catch (error) {
    console.error("Order document failed:", error);
    return NextResponse.json(
      { error: "Unable to prepare the document. Please try again." },
      { status: 500 },
    );
  }
}
