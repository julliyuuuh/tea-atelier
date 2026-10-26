import { requireUser } from "@/lib/require-user";
import { startCardOrder, CardError } from "@/lib/paymongo-card";
export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => null);
  if (
    !body ||
    Object.keys(body).some((k) => k !== "orderId") ||
    !Number.isSafeInteger(body.orderId) ||
    body.orderId < 1 ||
    body.orderId > 2147483647
  )
    return Response.json(
      { error: "Choose a valid card order." },
      { status: 400 },
    );
  try {
    return Response.json(await startCardOrder(body.orderId, auth.userId!), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof CardError
            ? e.message
            : "Unable to start card checkout. Please check its status.",
      },
      { status: e instanceof CardError ? e.status : 502 },
    );
  }
}
