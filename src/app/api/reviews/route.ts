import { getDb } from "@/lib/db";
import { fail, handleError, json, parseBody } from "@/lib/http";
import { listReviews, reviewStats } from "@/lib/queries";
import { clientIp, hit } from "@/lib/rate-limit";
import { reviewSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function payload() {
  const [reviews, stats] = await Promise.all([listReviews(true), reviewStats()]);
  return { reviews, stats };
}

export async function GET() {
  try {
    return json(await payload());
  } catch (err) {
    return handleError(err);
  }
}

/** POST /api/reviews — ziyaretçi yorum + yıldız bırakır (admin panelinden gizlenebilir/silinebilir). */
export async function POST(req: Request) {
  try {
    if (!(await hit(`review:${clientIp(req)}`, 3, 60 * 60_000)).ok) {
      return fail("Çok sık yorum gönderdiniz. Lütfen bir süre sonra tekrar deneyin.", 429);
    }
    const parsed = await parseBody(req, reviewSchema);
    if (parsed.error) return parsed.error;

    const { name, rating, comment } = parsed.data;
    const db = await getDb();
    await db.run("INSERT INTO reviews (name, rating, comment) VALUES (?, ?, ?)", [name, rating, comment]);
    return json(await payload(), 201);
  } catch (err) {
    return handleError(err);
  }
}
