import { requireUser } from "@/lib/require-user";
import { orderDocumentResponse } from "@/lib/order-document-response";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { userId, error } = await requireUser(req);
  if (error) return error;
  return orderDocumentResponse((await params).orderId, "invoice", userId);
}
