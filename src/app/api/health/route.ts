import { getDb } from "@/lib/db";
import { fail, json } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — kurulum kontrolü: veri tabanına bağlanabiliyor mu?
 * Yalnızca sürücü adı ve hizmet sayısını döner; gizli bilgi içermez.
 */
export async function GET() {
  try {
    const db = await getDb();
    const row = await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM services");
    return json({ ok: true, database: db.driver, services: row?.n ?? 0 });
  } catch (err) {
    console.error("[HEALTH]", err);
    return fail("Veri tabanına bağlanılamadı. Ortam değişkenlerini (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN) kontrol edin.", 503);
  }
}
