import { requireUser } from "@/lib/require-user";
import {
  orderReviews,
  saveReview,
  reviewId,
  ReviewError,
} from "@/lib/product-reviews";
import { reviewJson, reviewFailure } from "@/lib/review-response";
type Context = { params: Promise<{ orderId: string }> };
export async function GET(req: Request, { params }: Context) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  try {
    return reviewJson(
      await orderReviews(reviewId((await params).orderId), auth.userId),
    );
  } catch (error) {
    return reviewFailure(error);
  }
}
export async function PUT(req: Request, { params }: Context) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  try {
    const body = await req.json().catch(() => {
      throw new ReviewError("Invalid review.");
    });
    return reviewJson({
      review: await saveReview(
        reviewId((await params).orderId),
        auth.userId,
        body,
      ),
    });
  } catch (error) {
    return reviewFailure(error);
  }
}
