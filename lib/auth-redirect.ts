/** Accept only local paths; never redirect a signed-in user to an arbitrary host. */
export function safeAuthRedirect(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\s\u0000-\u001f\u007f]/.test(value)) return "/";
  return value;
}
