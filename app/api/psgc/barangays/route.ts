import { NextRequest, NextResponse } from "next/server";
import { getBarangays } from "@/lib/psgc";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const reg = Number(p.get("reg"));
  const prv = Number(p.get("prv"));
  const mun = Number(p.get("mun") ?? 0);
  if (![reg, prv, mun].every(Number.isInteger)) {
    return NextResponse.json({ error: "reg, prv and mun must be integers" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getBarangays(reg, prv, mun));
  } catch {
    return NextResponse.json({ error: "Address data unavailable" }, { status: 502 });
  }
}