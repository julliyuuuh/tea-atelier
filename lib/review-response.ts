import { NextResponse } from "next/server";
import { ReviewError } from "@/lib/product-reviews";
export const reviewJson = (body: unknown) =>
  NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
  });
export function reviewFailure(error: unknown) {
  if (error instanceof ReviewError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  console.error("Product review operation failed.");
  return NextResponse.json(
    { error: "Unable to load or save reviews. Please try again." },
    { status: 500 },
  );
}
