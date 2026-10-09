/**
 * Admin kimlik doğrulama: bcrypt ile hashlenmiş şifre + httpOnly cookie içinde JWT (HS256).
 * Şifre değiştirildiğinde token_version artar ve eski oturumlar geçersiz olur.
 */
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEFAULT_ADMIN_PASSWORD, getDb } from "./db";
import { isAdminAllowedFor } from "./host";

export const SESSION_COOKIE = "ba_admin_session";
const SESSION_HOURS = 8;

let cachedSecret: Uint8Array | null = null;

/**
 * JWT imza anahtarı: JWT_SECRET ortam değişkeni varsa o; yoksa veri tabanında (settings.jwt_secret)
 * ilk kullanımda rastgele üretilip saklanır. Böylece sunucusuz ortamda ek ayar gerekmez.
 */
async function getSecret(): Promise<Uint8Array> {
  if (cachedSecret) return cachedSecret;
  let secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    const db = await getDb();
    await db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('jwt_secret', ?)", [crypto.randomBytes(48).toString("hex")]);
    secret = (await db.get<{ value: string }>("SELECT value FROM settings WHERE key = 'jwt_secret'"))?.value;
  }
  if (!secret) throw new Error("JWT anahtarı oluşturulamadı.");
  cachedSecret = new TextEncoder().encode(secret);
  return cachedSecret;
}

async function getAdminRow() {
  const db = await getDb();
  const row = await db.get<{ password_hash: string; token_version: number }>("SELECT password_hash, token_version FROM admin WHERE id = 1");
  if (!row) throw new Error("Admin kaydı bulunamadı.");
  return row;
}

export async function verifyPassword(password: string): Promise<boolean> {
  return bcrypt.compare(password, (await getAdminRow()).password_hash);
}

let defaultCheck: { version: number; value: boolean } | null = null;

/** Hâlâ varsayılan şifre (000000) kullanılıyor mu? (bcrypt pahalı olduğu için sürüme göre önbelleğe alınır) */
export async function isUsingDefaultPassword(): Promise<boolean> {
  const row = await getAdminRow();
  if (defaultCheck?.version === row.token_version) return defaultCheck.value;
  const value = await bcrypt.compare(DEFAULT_ADMIN_PASSWORD, row.password_hash);
  defaultCheck = { version: row.token_version, value };
  return value;
}

export async function changePassword(newPassword: string): Promise<void> {
  const hash = await bcrypt.hash(newPassword, 12);
  const db = await getDb();
  await db.run("UPDATE admin SET password_hash = ?, token_version = token_version + 1, updated_at = datetime('now') WHERE id = 1", [hash]);
}

export async function startSession(): Promise<void> {
  const version = (await getAdminRow()).token_version;
  const token = await new SignJWT({ role: "admin", v: version })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(await getSecret());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
}

export async function isAdmin(): Promise<boolean> {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return false;
    const { payload } = await jwtVerify(token, await getSecret(), { algorithms: ["HS256"] });
    if (payload.role !== "admin") return false;
    return payload.v === (await getAdminRow()).token_version;
  } catch {
    return false;
  }
}

const notFound = () => new NextResponse("Not found", { status: 404 });

/**
 * Giriş gerektirmeyen yönetim rotaları (login/logout/me) için: yalnızca yönetim alan adında çalışır.
 * Yetkisizse hazır bir 404 yanıtı döner, uygunsa null.
 */
export function adminHostGuard(req: Request): NextResponse | null {
  return isAdminAllowedFor(req) ? null : notFound();
}

/**
 * Admin API rotalarının başında çağrılır. Yetkisizse hazır bir yanıt döner, yetkiliyse null.
 *  - Yanlış alan adı (müşteri sitesi) → 404
 *  - Yazma isteklerinde Origin kontrolü (CSRF savunması) → 403
 *  - Oturum yok → 401
 */
export async function guardAdmin(req: Request): Promise<NextResponse | null> {
  const wrongHost = adminHostGuard(req);
  if (wrongHost) return wrongHost;

  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin) {
      let originHost = "";
      try {
        originHost = new URL(origin).host;
      } catch {
        /* geçersiz origin → aşağıda reddedilir */
      }
      if (!host || originHost !== host) {
        return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
      }
    }
  }
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
  }
  return null;
}
