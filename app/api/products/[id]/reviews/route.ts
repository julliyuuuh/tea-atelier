import { publicReviews, reviewId } from "@/lib/product-reviews";
import { reviewJson, reviewFailure } from "@/lib/review-response";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return reviewJson(
      await publicReviews(
        reviewId(id),
        Number(new URL(req.url).searchParams.get("page") ?? 1),
      ),
    );
  } catch (error) {
    return reviewFailure(error);
  }
}
