import {
  reviewReturn,
  returnHistory,
  linkPayment,
  issueRefund,
  reconcileRefund,
} from "@/lib/return-store";
import { parseReturnId, textField } from "@/lib/returns";
import {
  returnAdmin,
  jsonBody,
  returnFailure,
  returnJson,
} from "@/lib/return-api";
type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, { params }: Context) {
  const auth = await returnAdmin(req);
  if (auth.error) return auth.error;
  try {
    return returnJson({
      events: await returnHistory(parseReturnId((await params).id)),
    });
  } catch (error) {
    return returnFailure(error);
  }
}
export async function PATCH(req: Request, { params }: Context) {
  const auth = await returnAdmin(req);
  if (auth.error) return auth.error;
  try {
    const id = parseReturnId((await params).id);
    const body = await jsonBody(req);
    if (body.action === "link_payment")
      await linkPayment(
        id,
        textField(body.paymentId, "Payment ID", 5, 100),
        auth.userId!,
      );
    else if (body.action === "refund")
      await issueRefund(id, auth.userId!, body);
    else if (body.action === "check_refund")
      await reconcileRefund(id, auth.userId!);
    else await reviewReturn(id, auth.userId!, body);
    return returnJson({ ok: true });
  } catch (error) {
    return returnFailure(error);
  }
}
