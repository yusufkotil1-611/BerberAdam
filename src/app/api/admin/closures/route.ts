import { guardAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fail, handleError, json, parseBody } from "@/lib/http";
import { listClosures } from "@/lib/queries";
import { closureSchema } from "@/lib/schemas";
import { addDays, shopNow } from "@/lib/time";

export const dynamic = "force-dynamic";

// Geçmiş kapalı günler listeyi kalabalıklaştırmasın diye son 7 günden itibaren gösterilir
const recent = () => addDays(shopNow().date, -7);

export async function GET(req: Request) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    return json({ closures: await listClosures(recent()) });
  } catch (err) {
    return handleError(err);
  }
}

/** POST — tatil / özel kapalı gün ekle (tüm gün veya saat aralığı; tüm dükkan veya tek personel) */
export async function POST(req: Request) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    const parsed = await parseBody(req, closureSchema);
    if (parsed.error) return parsed.error;
    const c = parsed.data;

    const db = await getDb();
    if (c.staffId && !(await db.get("SELECT 1 AS x FROM staff WHERE id = ?", [c.staffId]))) return fail("Personel bulunamadı.", 400);

    // Kapatılan aralıkta zaten randevu varsa yöneticiyi uyar (randevular otomatik iptal edilmez)
    const clash = await db.get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM appointments
       WHERE date = ? AND status IN ('pending','confirmed')
         AND (? IS NULL OR staff_id = ?)
         AND (? IS NULL OR (start_time < ? AND end_time > ?))`,
      [c.date, c.staffId, c.staffId, c.startTime, c.endTime, c.startTime],
    );

    await db.run("INSERT INTO closures (date, start_time, end_time, staff_id, reason) VALUES (?, ?, ?, ?, ?)", [
      c.date,
      c.startTime,
      c.endTime,
      c.staffId,
      c.reason,
    ]);
    return json({ closures: await listClosures(recent()), conflictingAppointments: clash?.n ?? 0 }, 201);
  } catch (err) {
    return handleError(err);
  }
}
