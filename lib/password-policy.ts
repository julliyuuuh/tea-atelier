export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_HINT =
  "Use at least 12 characters with uppercase and lowercase letters and a number.";

export function getPasswordError(password: unknown): string | null {
  if (typeof password !== "string") return "Enter a valid password.";
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return PASSWORD_HINT;
  }
  if (new TextEncoder().encode(password).length > 72) {
    return "Password is too long. Use no more than 72 UTF-8 bytes.";
  }
  return null;
}
