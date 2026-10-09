import { guardAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { handleError, json, parseBody } from "@/lib/http";
import { listServices } from "@/lib/queries";
import { serviceSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    return json({ services: await listServices(false) });
  } catch (err) {
    return handleError(err);
  }
}

/** POST — yeni hizmet ekle */
export async function POST(req: Request) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    const parsed = await parseBody(req, serviceSchema);
    if (parsed.error) return parsed.error;
    const s = parsed.data;

    const db = await getDb();
    await db.run(
      `INSERT INTO services (name, description, price, duration, icon, popular, active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM services))`,
      [s.name, s.description, s.price, s.duration, s.icon, s.popular ? 1 : 0, s.active ? 1 : 0],
    );
    return json({ services: await listServices(false) }, 201);
  } catch (err) {
    return handleError(err);
  }
}
