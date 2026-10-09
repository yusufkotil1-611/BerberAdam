import { adminHostGuard, isUsingDefaultPassword, startSession, verifyPassword } from "@/lib/auth";
import { fail, handleError, json, parseBody } from "@/lib/http";
import { clientIp, hit, peek, reset } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const IP_LIMIT = 5; // IP başına 15 dakikada en fazla 5 hatalı deneme
const GLOBAL_LIMIT = 100; // tüm IP'ler için saatte en fazla 100 hatalı deneme (dağıtık deneme koruması)

export async function POST(req: Request) {
  try {
    const wrongHost = adminHostGuard(req);
    if (wrongHost) return wrongHost;

    const ipKey = `login:${clientIp(req)}`;
    const [ipState, globalState] = await Promise.all([peek(ipKey, IP_LIMIT), peek("login:global", GLOBAL_LIMIT)]);
    if (!ipState.ok || !globalState.ok) {
      // Yalnızca gerçekten bloklanmış sayaçların bekleme süresini göster
      const wait = Math.max(ipState.ok ? 0 : ipState.retryAfterSeconds, globalState.ok ? 0 : globalState.retryAfterSeconds);
      return fail(`Çok fazla hatalı deneme. Lütfen ${Math.max(1, Math.ceil(wait / 60))} dakika sonra tekrar deneyin.`, 429);
    }

    const parsed = await parseBody(req, loginSchema);
    if (parsed.error) return parsed.error;

    if (!(await verifyPassword(parsed.data.password))) {
      await Promise.all([hit(ipKey, IP_LIMIT, 15 * 60_000), hit("login:global", GLOBAL_LIMIT, 60 * 60_000)]);
      await new Promise((r) => setTimeout(r, 500)); // kaba kuvveti yavaşlat
      return fail("Şifre hatalı.", 401);
    }

    await reset(ipKey);
    await startSession();
    return json({ ok: true, usingDefaultPassword: await isUsingDefaultPassword() });
  } catch (err) {
    return handleError(err);
  }
}
