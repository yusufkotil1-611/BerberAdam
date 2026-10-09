import { guardAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fail, handleError, json, parseBody, parseId } from "@/lib/http";
import { listStaff } from "@/lib/queries";
import { staffSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    const id = parseId((await ctx.params).id);
    if (!id) return fail("Geçersiz personel.", 400);
    const parsed = await parseBody(req, staffSchema);
    if (parsed.error) return parsed.error;
    const s = parsed.data;

    const db = await getDb();
    if (!s.active) {
      const others = await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM staff WHERE active = 1 AND id != ?", [id]);
      if ((others?.n ?? 0) === 0) return fail("En az bir aktif personel kalmalı.", 400);
    }
    const info = await db.run("UPDATE staff SET name = ?, title = ?, active = ? WHERE id = ?", [s.name, s.title, s.active ? 1 : 0, id]);
    if (info.changes === 0) return fail("Personel bulunamadı.", 404);
    return json({ staff: await listStaff(false) });
  } catch (err) {
    return handleError(err);
  }
}

/** DELETE — randevusu olan personel silinemez (pasif yapılmalı) */
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    const id = parseId((await ctx.params).id);
    if (!id) return fail("Geçersiz personel.", 400);

    const db = await getDb();
    if (await db.get("SELECT 1 AS x FROM appointments WHERE staff_id = ? LIMIT 1", [id])) {
      return fail("Bu personelin randevu geçmişi var; silmek yerine pasif yapın.", 409);
    }
    const others = await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM staff WHERE active = 1 AND id != ?", [id]);
    if ((others?.n ?? 0) === 0) return fail("En az bir aktif personel kalmalı.", 400);

    await db.run("DELETE FROM staff WHERE id = ?", [id]);
    return json({ staff: await listStaff(false) });
  } catch (err) {
    return handleError(err);
  }
}
