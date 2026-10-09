import { changePassword, guardAdmin, isUsingDefaultPassword, startSession, verifyPassword } from "@/lib/auth";
import { DEFAULT_ADMIN_PASSWORD } from "@/lib/db";
import { fail, handleError, json, parseBody } from "@/lib/http";
import { clientIp, hit, peek } from "@/lib/rate-limit";
import { passwordChangeSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** POST /api/admin/password { oldPassword, newPassword } — mevcut şifre doğrulanarak değiştirilir. */
export async function POST(req: Request) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;

    const ipKey = `pwchange:${clientIp(req)}`;
    if (!(await peek(ipKey, 5)).ok) return fail("Çok fazla hatalı deneme. Lütfen biraz bekleyin.", 429);

    const parsed = await parseBody(req, passwordChangeSchema);
    if (parsed.error) return parsed.error;
    const { oldPassword, newPassword } = parsed.data;

    if (!(await verifyPassword(oldPassword))) {
      await hit(ipKey, 5, 15 * 60_000);
      return fail("Mevcut şifre hatalı.", 401);
    }
    if (newPassword === oldPassword) return fail("Yeni şifre mevcut şifreyle aynı olamaz.", 400);
    if (newPassword === DEFAULT_ADMIN_PASSWORD) return fail("Güvenlik için varsayılan şifre tekrar kullanılamaz.", 400);

    await changePassword(newPassword);
    await startSession(); // eski oturumlar geçersiz oldu; bu cihaza yeni oturum ver
    return json({ ok: true, usingDefaultPassword: await isUsingDefaultPassword() });
  } catch (err) {
    return handleError(err);
  }
}
