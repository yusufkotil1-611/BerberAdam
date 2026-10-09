import { guardAdmin } from "@/lib/auth";
import { handleError, json } from "@/lib/http";
import { getAdminStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    return json(await getAdminStats());
  } catch (err) {
    return handleError(err);
  }
}
