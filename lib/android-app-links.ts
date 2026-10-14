export const ANDROID_PACKAGE = "com.teaatelier.mobiledist";
export const ANDROID_RETURN_ORIGIN = "https://ourtea-atelier.com";

export function androidSigningFingerprints(
  value: string | undefined,
): string[] {
  const fingerprints =
    value?.split(",").map((item) => item.trim().toUpperCase()) ?? [];
  if (
    !fingerprints.length ||
    fingerprints.some((item) => !/^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(item))
  )
    return [];
  return [...new Set(fingerprints)];
}

export function androidReturnUrls(orderId: number) {
  const path = `${ANDROID_RETURN_ORIGIN}/payment-return/android/${orderId}`;
  return {
    success: `${path}?payment=returned`,
    failed: `${path}?payment=failed`,
  };
}
