import { updateAppointmentStatus } from "@/lib/booking";
import { guardAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fail, handleError, json, parseBody, parseId } from "@/lib/http";
import { getAppointment } from "@/lib/queries";
import { statusSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/appointments/:id { status } — Onayla / Tamamlandı / İptal Et */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    const id = parseId((await ctx.params).id);
    if (!id) return fail("Geçersiz randevu.", 400);

    const parsed = await parseBody(req, statusSchema);
    if (parsed.error) return parsed.error;

    await updateAppointmentStatus(id, parsed.data.status);
    return json({ appointment: await getAppointment(id) });
  } catch (err) {
    return handleError(err);
  }
}

/** DELETE /api/admin/appointments/:id — kalıcı silme (yalnızca iptal edilmiş randevular) */
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    const id = parseId((await ctx.params).id);
    if (!id) return fail("Geçersiz randevu.", 400);

    const appt = await getAppointment(id);
    if (!appt) return fail("Randevu bulunamadı.", 404);
    if (appt.status !== "cancelled") return fail("Yalnızca iptal edilmiş randevular silinebilir.", 400);

    const db = await getDb();
    await db.run("DELETE FROM appointments WHERE id = ?", [id]);
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
