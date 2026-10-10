import { requireUser } from "@/lib/require-user";
import { createReturn, readCustomerReturn } from "@/lib/return-store";
import { parseOrderId } from "@/lib/returns";
import { jsonBody, returnFailure, returnJson } from "@/lib/return-api";
type Context = { params: Promise<{ orderId: string }> };
export async function GET(req: Request, { params }: Context) {
  const { userId, error } = await requireUser(req);
  if (error) return error;
  try {
    return returnJson(
      await readCustomerReturn(parseOrderId((await params).orderId), userId),
    );
  } catch (failure) {
    return returnFailure(failure);
  }
}
export async function POST(req: Request, { params }: Context) {
  const { userId, error } = await requireUser(req);
  if (error) return error;
  try {
    const orderId = parseOrderId((await params).orderId);
    await createReturn(orderId, userId, await jsonBody(req));
    return returnJson(await readCustomerReturn(orderId, userId));
  } catch (failure) {
    return returnFailure(failure);
  }
}
