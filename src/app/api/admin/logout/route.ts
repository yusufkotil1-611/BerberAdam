import { adminHostGuard, endSession } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const wrongHost = adminHostGuard(req);
    if (wrongHost) return wrongHost;
    await endSession();
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
