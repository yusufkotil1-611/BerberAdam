import { getDb } from "@/lib/db";
import { fail, handleError, json } from "@/lib/http";
import { clientIp, hit } from "@/lib/rate-limit";
import { LOYALTY_TARGET } from "@/lib/site";
import { normalizePhone } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * GET /api/loyalty?phone=05xx...
 * Sadakat programı simülasyonu: tamamlanan randevu sayısından kaç "tıraş damgası" olduğunu hesaplar.
 * Yalnızca sayı döner (kişisel veri sızdırılmaz); hız sınırı ile numara taramasına karşı korunur.
 */
export async function GET(req: Request) {
  try {
    if (!(await hit(`loyalty:${clientIp(req)}`, 8, 10 * 60_000)).ok) return fail("Çok fazla sorgu. Lütfen biraz bekleyin.", 429);

    const phone = normalizePhone(new URL(req.url).searchParams.get("phone") ?? "");
    if (!phone) return fail("Geçerli bir cep telefonu girin (05XX XXX XX XX).", 400);

    const db = await getDb();
    const row = await db.get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM appointments a JOIN customers c ON c.id = a.customer_id
       WHERE c.phone = ? AND a.status = 'completed'`,
      [phone],
    );
    const completed = row?.n ?? 0;

    return json({
      completed,
      target: LOYALTY_TARGET,
      stamps: completed % LOYALTY_TARGET,
      rewardsEarned: Math.floor(completed / LOYALTY_TARGET),
    });
  } catch (err) {
    return handleError(err);
  }
}
