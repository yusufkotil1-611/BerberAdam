import { guardAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fail, handleError, json, parseBody, parseId } from "@/lib/http";
import { listAppointments, listCustomers } from "@/lib/queries";
import { customerPatchSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET — müşterinin geçmiş randevuları */
export async function GET(req: Request, ctx: Ctx) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    const id = parseId((await ctx.params).id);
    if (!id) return fail("Geçersiz müşteri.", 400);
    return json({ appointments: (await listAppointments({ customerId: id, limit: 500 })).reverse() });
  } catch (err) {
    return handleError(err);
  }
}

/** PATCH — müşteri notu / ad / e-posta güncelle */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    const id = parseId((await ctx.params).id);
    if (!id) return fail("Geçersiz müşteri.", 400);

    const parsed = await parseBody(req, customerPatchSchema);
    if (parsed.error) return parsed.error;
    const { name, email, notes } = parsed.data;

    const db = await getDb();
    if (!(await db.get("SELECT 1 AS x FROM customers WHERE id = ?", [id]))) return fail("Müşteri bulunamadı.", 404);
    await db.run("UPDATE customers SET name = COALESCE(?, name), email = COALESCE(?, email), notes = COALESCE(?, notes) WHERE id = ?", [
      name ?? null,
      email ?? null,
      notes ?? null,
      id,
    ]);

    return json({ customer: (await listCustomers()).find((c) => c.id === id) });
  } catch (err) {
    return handleError(err);
  }
}

/** DELETE — müşteriyi ve tüm randevularını siler (KVKK "silme talebi" için) */
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    const id = parseId((await ctx.params).id);
    if (!id) return fail("Geçersiz müşteri.", 400);
    const db = await getDb();
    await db.run("DELETE FROM customers WHERE id = ?", [id]);
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
