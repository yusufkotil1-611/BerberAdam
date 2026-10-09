import { guardAdmin } from "@/lib/auth";
import { handleError, json } from "@/lib/http";
import { listReviews, reviewStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    const [reviews, stats] = await Promise.all([listReviews(false, 500), reviewStats()]);
    return json({ reviews, stats });
  } catch (err) {
    return handleError(err);
  }
}
