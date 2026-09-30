import { NextRequest, NextResponse } from "next/server";
import { getCities } from "@/lib/psgc";

export async function GET(req: NextRequest) {
  const reg = Number(req.nextUrl.searchParams.get("reg"));
  const prv = Number(req.nextUrl.searchParams.get("prv"));
  if (!Number.isInteger(reg) || !Number.isInteger(prv)) {
    return NextResponse.json({ error: "reg and prv must be integers" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getCities(reg, prv));
  } catch {
    return NextResponse.json({ error: "Address data unavailable" }, { status: 502 });
  }
}