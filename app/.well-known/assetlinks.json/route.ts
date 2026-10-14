import {
  ANDROID_PACKAGE,
  androidSigningFingerprints,
} from "@/lib/android-app-links";

export const dynamic = "force-dynamic";

export function GET() {
  const fingerprints = androidSigningFingerprints(
    process.env.ANDROID_APP_SHA256_CERT_FINGERPRINTS,
  );
  if (!fingerprints.length) {
    return Response.json([], {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return Response.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: ANDROID_PACKAGE,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
