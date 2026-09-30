import { NextResponse } from "next/server";
import { getProvinces } from "@/lib/psgc";

export async function GET() {
  try {
    return NextResponse.json(await getProvinces());
  } catch {
    return NextResponse.json({ error: "Address data unavailable" }, { status: 502 });
  }
}