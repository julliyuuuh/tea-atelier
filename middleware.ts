import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const allowedOrigins = [
  "https://tea-atelier-mobile-production.up.railway.app",
  "https://localhost", // Capacitor Android/iOS default
  "capacitor://localhost", // older Capacitor / iOS
];

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const isAllowed = allowedOrigins.includes(origin);

  if (request.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    preflight.headers.set("Vary", "Origin");
    if (isAllowed) preflight.headers.set("Access-Control-Allow-Origin", origin);
    preflight.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    preflight.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Idempotency-Key",
    );
    return preflight;
  }

  const response = NextResponse.next();
  response.headers.set("Vary", "Origin");
  if (isAllowed) response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Idempotency-Key",
  );
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
