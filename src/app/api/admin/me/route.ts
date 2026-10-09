import { adminHostGuard, isAdmin, isUsingDefaultPassword } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Oturum durumunu döner (admin sayfası açılışta bununla giriş ekranı mı panel mi göstereceğine karar verir). */
export async function GET(req: Request) {
  try {
    const wrongHost = adminHostGuard(req);
    if (wrongHost) return wrongHost;
    if (!(await isAdmin())) return json({ authenticated: false });
    return json({ authenticated: true, usingDefaultPassword: await isUsingDefaultPassword() });
  } catch (err) {
    return handleError(err);
  }
}
