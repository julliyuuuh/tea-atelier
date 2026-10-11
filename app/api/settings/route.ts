import { NextResponse } from "next/server";
import { readSettings } from "@/lib/store-settings-server";
export async function GET() {
  try {
    return NextResponse.json(await readSettings(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Store settings are temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
