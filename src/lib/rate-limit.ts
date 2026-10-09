/**
 * Hız sınırlayıcı — sayaçlar veri tabanında tutulur.
 * (Netlify gibi sunucusuz ortamlarda her istek farklı bir sunucu örneğine düşebildiği için bellek içi sayaç
 * güvenilir olmaz; bu yüzden tüm örneklerin paylaştığı veri tabanı kullanılır.)
 */
import { getDb } from "./db";

export interface LimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

/** key için windowMs içinde en fazla `limit` isteği kabul eder; sayacı TEK atomik ifadeyle artırır. */
export async function hit(key: string, limit: number, windowMs: number): Promise<LimitResult> {
  const db = await getDb();
  const now = Date.now();
  const rows = await db.all<{ count: number; reset_at: number }>(
    `INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET
       count    = CASE WHEN reset_at <= ? THEN 1 ELSE count + 1 END,
       reset_at = CASE WHEN reset_at <= ? THEN ? ELSE reset_at END
     RETURNING count, reset_at`,
    [key, now + windowMs, now, now, now + windowMs],
  );
  const row = rows[0];

  // Süresi dolmuş kayıtları ara sıra temizle
  if (Math.random() < 0.02) await db.run("DELETE FROM rate_limits WHERE reset_at < ?", [now]);

  return { ok: row.count <= limit, retryAfterSeconds: Math.max(0, Math.ceil((row.reset_at - now) / 1000)) };
}

/** Sayacı artırmadan bakar. */
export async function peek(key: string, limit: number): Promise<LimitResult> {
  const db = await getDb();
  const now = Date.now();
  const row = await db.get<{ count: number; reset_at: number }>("SELECT count, reset_at FROM rate_limits WHERE key = ?", [key]);
  if (!row || row.reset_at <= now) return { ok: true, retryAfterSeconds: 0 };
  return { ok: row.count < limit, retryAfterSeconds: Math.ceil((row.reset_at - now) / 1000) };
}

export async function reset(key: string): Promise<void> {
  const db = await getDb();
  await db.run("DELETE FROM rate_limits WHERE key = ?", [key]);
}

/**
 * İstemci IP'si. Netlify, gerçek IP'yi sahte olamayan `x-nf-client-connection-ip` başlığıyla iletir.
 * Kendi sunucunuzda Caddy/Nginx arkasında `X-Forwarded-For` kullanılır.
 */
export function clientIp(req: Request): string {
  if (process.env.NETLIFY) {
    const nf = req.headers.get("x-nf-client-connection-ip");
    if (nf) return nf.trim();
  }
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}
