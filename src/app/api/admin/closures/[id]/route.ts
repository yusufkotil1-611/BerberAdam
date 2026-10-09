import { guardAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fail, handleError, json, parseId } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    const id = parseId((await ctx.params).id);
    if (!id) return fail("Geçersiz kayıt.", 400);
    const db = await getDb();
    await db.run("DELETE FROM closures WHERE id = ?", [id]);
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
