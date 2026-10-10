import { listAdminReturns } from "@/lib/return-store";
import { ReturnError } from "@/lib/returns";
import { returnAdmin, returnFailure, returnJson } from "@/lib/return-api";
export async function GET(req: Request) {
  const auth = await returnAdmin(req);
  if (auth.error) return auth.error;
  try {
    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") ?? 1);
    const status = url.searchParams.get("status") || null;
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 100000 ||
      (status &&
        ![
          "REQUESTED",
          "APPROVED",
          "REJECTED",
          "RECEIVED",
          "REFUNDED",
          "CLOSED",
        ].includes(status))
    )
      throw new ReturnError("Invalid filter or page.");
    return returnJson(await listAdminReturns(page, status));
  } catch (error) {
    return returnFailure(error);
  }
}
