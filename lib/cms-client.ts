export async function checkCmsSaves(requests: Promise<Response>[]) {
  const results = await Promise.allSettled(requests);
  for (const result of results) {
    if (result.status === "rejected")
      throw new Error(
        "Unable to save the content order. Check your connection and try again.",
      );
    if (!result.value.ok) {
      const body = await result.value.json().catch(() => null);
      throw new Error(body?.error || "Unable to save the content order.");
    }
  }
}
