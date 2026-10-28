/** Login requests can receive HTML error/challenge pages from the hosting edge. */
export async function readAuthResponse(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  const object = data && typeof data === "object" && !Array.isArray(data);
  if (!response.ok) {
    if (object && typeof data.error === "string" && data.error.trim()) {
      throw new Error(data.error);
    }
    if (response.status === 429) {
      const seconds = Number(response.headers.get("Retry-After"));
      throw new Error(Number.isFinite(seconds) && seconds > 0
        ? `Too many attempts. Please try again in ${Math.ceil(seconds / 60)} minute(s).`
        : "Too many attempts. Please wait a few minutes before trying again.");
    }
    if (response.status === 403) {
      throw new Error("Sign-in was blocked by a security check. Refresh the page and try again.");
    }
    throw new Error(fallback);
  }
  if (!object || (data.requiresTotp !== true &&
      (typeof data.token !== "string" || !data.token || !data.user ||
       typeof data.user !== "object" || typeof data.user.role !== "string"))) {
    throw new Error(fallback);
  }
  return data;
}
