import { getAvailability } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { fail, handleError, json } from "@/lib/http";
import { clientIp, hit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability?date=2026-10-12&services=1,3&staffId=2
 * Seçilen hizmetlerin toplam süresine göre gün içindeki saatlerin dolu/boş durumunu döner.
 * staffId verilmezse ("Fark etmez") en az bir berberin müsait olduğu saatler boş sayılır.
 */
export async function GET(req: Request) {
  try {
    if (!(await hit(`avail:${clientIp(req)}`, 120, 60_000)).ok) return fail("Çok fazla istek. Lütfen biraz bekleyin.", 429);

    const url = new URL(req.url);
    const date = url.searchParams.get("date") ?? "";
    const ids = (url.searchParams.get("services") ?? "")
      .split(",")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 8);
    if (ids.length === 0) return fail("Önce bir hizmet seçin.", 400);

    const staffParam = url.searchParams.get("staffId");
    const staffId = staffParam && staffParam !== "any" ? Number(staffParam) : null;
    if (staffId !== null && (!Number.isInteger(staffId) || staffId <= 0)) return fail("Geçersiz personel.", 400);

    const db = await getDb();
    const rows = await db.all<{ duration: number }>(
      `SELECT duration FROM services WHERE active = 1 AND id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    if (rows.length !== new Set(ids).size) return fail("Seçilen hizmetlerden biri artık mevcut değil.", 400);
    const duration = rows.reduce((n, r) => n + r.duration, 0);

    return json(await getAvailability({ date, staffId, duration }));
  } catch (err) {
    return handleError(err);
  }
}
