import { guardAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fail, handleError, json, parseBody, parseId } from "@/lib/http";
import { listReviews, reviewStats } from "@/lib/queries";
import { reviewPatchSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function payload() {
  const [reviews, stats] = await Promise.all([listReviews(false, 500), reviewStats()]);
  return { reviews, stats };
}

/** PATCH { approved } — yorumu yayından kaldır / tekrar yayınla */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    const id = parseId((await ctx.params).id);
    if (!id) return fail("Geçersiz yorum.", 400);
    const parsed = await parseBody(req, reviewPatchSchema);
    if (parsed.error) return parsed.error;

    const db = await getDb();
    const info = await db.run("UPDATE reviews SET approved = ? WHERE id = ?", [parsed.data.approved ? 1 : 0, id]);
    if (info.changes === 0) return fail("Yorum bulunamadı.", 404);
    return json(await payload());
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    const id = parseId((await ctx.params).id);
    if (!id) return fail("Geçersiz yorum.", 400);
    const db = await getDb();
    await db.run("DELETE FROM reviews WHERE id = ?", [id]);
    return json(await payload());
  } catch (err) {
    return handleError(err);
  }
}
