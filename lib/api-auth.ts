import { verifyToken } from "@/lib/auth-server";

export function getUserId(req: Request): number | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const payload = verifyToken(authHeader.slice(7));
    return payload.userId;
  } catch {
    return null;
  }
}