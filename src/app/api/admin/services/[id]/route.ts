import { guardAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fail, handleError, json, parseBody, parseId } from "@/lib/http";
import { listServices } from "@/lib/queries";
import { serviceSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PUT — hizmet adı / fiyat / süre / görünürlük güncelle (geçmiş randevuların fiyatı değişmez; kalemler kopyalanmıştır) */
export async function PUT(req: Request, ctx: Ctx) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    const id = parseId((await ctx.params).id);
    if (!id) return fail("Geçersiz hizmet.", 400);
    const parsed = await parseBody(req, serviceSchema);
    if (parsed.error) return parsed.error;
    const s = parsed.data;

    const db = await getDb();
    const info = await db.run(
      "UPDATE services SET name = ?, description = ?, price = ?, duration = ?, icon = ?, popular = ?, active = ? WHERE id = ?",
      [s.name, s.description, s.price, s.duration, s.icon, s.popular ? 1 : 0, s.active ? 1 : 0, id],
    );
    if (info.changes === 0) return fail("Hizmet bulunamadı.", 404);
    return json({ services: await listServices(false) });
  } catch (err) {
    return handleError(err);
  }
}

/** DELETE — hizmeti sil (eski randevulardaki hizmet adı/fiyatı korunur) */
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    const id = parseId((await ctx.params).id);
    if (!id) return fail("Geçersiz hizmet.", 400);
    const db = await getDb();
    const info = await db.run("DELETE FROM services WHERE id = ?", [id]);
    if (info.changes === 0) return fail("Hizmet bulunamadı.", 404);
    return json({ services: await listServices(false) });
  } catch (err) {
    return handleError(err);
  }
}
