import { guardAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { handleError } from "@/lib/http";
import { shopNow } from "@/lib/time";

export const dynamic = "force-dynamic";

// Yedeğe alınacak tablolar. Güvenlik için şifre özeti (admin) ve oturum anahtarı (settings.jwt_secret) DAHİL EDİLMEZ.
const TABLES = ["services", "staff", "customers", "appointments", "appointment_services", "working_hours", "closures", "reviews", "notifications"];

/** GET — tüm veriyi JSON olarak indirir (yedek). */
export async function GET(req: Request) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;

    const db = await getDb();
    const [tables, settings] = await Promise.all([
      Promise.all(TABLES.map(async (t) => [t, await db.all(`SELECT * FROM ${t}`)] as const)),
      db.all("SELECT key, value FROM settings WHERE key != 'jwt_secret'"),
    ]);

    const body = JSON.stringify({ app: "BERBERADAM", exportedAt: new Date().toISOString(), tables: { ...Object.fromEntries(tables), settings } }, null, 2);
    return new Response(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="berberadam-yedek-${shopNow().date}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
