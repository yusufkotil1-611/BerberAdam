import { guardAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { handleError, json, parseBody } from "@/lib/http";
import { listStaff } from "@/lib/queries";
import { staffSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    return json({ staff: await listStaff(false) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    const parsed = await parseBody(req, staffSchema);
    if (parsed.error) return parsed.error;
    const s = parsed.data;

    const db = await getDb();
    await db.run(
      "INSERT INTO staff (name, title, active, sort_order) VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM staff))",
      [s.name, s.title, s.active ? 1 : 0],
    );
    return json({ staff: await listStaff(false) }, 201);
  } catch (err) {
    return handleError(err);
  }
}
