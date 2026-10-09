import { guardAdmin } from "@/lib/auth";
import { clearDemo, seedDemo } from "@/lib/demo";
import { handleError, json, parseBody } from "@/lib/http";
import { demoSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** POST { action: "seed" | "clear" } — örnek veri yükle / tüm demo kayıtlarını (müşteri, randevu, yorum) temizle */
export async function POST(req: Request) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    const parsed = await parseBody(req, demoSchema);
    if (parsed.error) return parsed.error;

    if (parsed.data.action === "seed") return json({ ok: true, ...(await seedDemo()) });
    await clearDemo();
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
