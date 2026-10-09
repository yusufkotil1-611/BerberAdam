/**
 * Alan adına göre erişim denetimi (müşteri sitesi ve yönetim paneli ayrı adreslerde).
 *
 * ADMIN_HOST tanımlıysa (virgülle birden fazla olabilir):
 *   - Yönetim alan adında: /admin ve /api/admin çalışır, "/" → /admin'e yönlenir.
 *   - Diğer tüm alan adlarında (müşteri sitesi, önizleme adresleri...): /admin ve /api/admin 404 verir.
 * ADMIN_HOST boşsa (geliştirme) kısıtlama yoktur: her şey tek adreste çalışır.
 *
 * Bu kontroller uygulama kodunda yapıldığı için her barındırma ortamında (Netlify, VPS, yerel) aynı çalışır.
 */
import { headers } from "next/headers";

function adminHosts(): string[] {
  return (process.env.ADMIN_HOST ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/** İstekteki alan adı (port dahil, küçük harf). Önce Host başlığı: istemci tarafından değiştirilemeyen değer budur. */
function hostOf(get: (name: string) => string | null): string {
  return (get("host") ?? get("x-forwarded-host") ?? "").split(",")[0].trim().toLowerCase();
}

function matches(host: string): boolean {
  const list = adminHosts();
  return list.includes(host) || list.includes(host.replace(/:\d+$/, ""));
}

/** Ayrı yönetim alan adı kullanılıyor mu? */
export function hasSeparateAdminHost(): boolean {
  return adminHosts().length > 0;
}

/**
 * "Admin Paneli" girişinin adresi. Yönetim ayrı alan adındaysa (ADMIN_HOST) o adrese, değilse aynı sitedeki /admin'e gider.
 */
export function adminEntryUrl(): string {
  const host = adminHosts()[0];
  if (!host) return "/admin";
  const local = /^(localhost|127\.0\.0\.1|\[::1\]|[^:]*\.localhost)(:\d+)?$/.test(host);
  return `${local ? "http" : "https"}://${host}/admin`;
}

/** API rotaları için: bu istek yönetim işlemlerine açık bir alan adından mı geliyor? */
export function isAdminAllowedFor(req: Request): boolean {
  if (!hasSeparateAdminHost()) return true;
  return matches(hostOf((n) => req.headers.get(n)));
}

/** Sunucu bileşenleri için (headers() üzerinden). */
export async function isAdminAllowedHere(): Promise<boolean> {
  if (!hasSeparateAdminHost()) return true;
  const h = await headers();
  return matches(hostOf((n) => h.get(n)));
}

/** Yönetim alan adında mıyız? (yalnızca ayrı alan adı kullanılıyorsa true olabilir) */
export async function isOnAdminHost(): Promise<boolean> {
  if (!hasSeparateAdminHost()) return false;
  return isAdminAllowedHere();
}
