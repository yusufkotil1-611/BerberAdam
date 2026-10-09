/** Admin paneli için fetch yardımcıları. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export async function api<T = Record<string, unknown>>(
  url: string,
  opts: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
    credentials: "same-origin",
  });
  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    /* boş gövde */
  }
  if (!res.ok) {
    if (res.status === 401 && !url.endsWith("/login")) window.dispatchEvent(new Event("admin:unauthorized"));
    throw new ApiError((data.error as string) || "İstek başarısız oldu.", res.status, data);
  }
  return data as T;
}

/** "YYYY-MM-DD HH:MM:SS" (UTC, SQLite) → "9 Eki 14:05" (İstanbul saati) */
export function formatCreatedAt(sqlDate: string): string {
  const d = new Date(sqlDate.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return sqlDate;
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(d);
}

/** Müşteriye WhatsApp'tan yazmak için bağlantı (05XXXXXXXXX → 905XXXXXXXXX) */
export function customerWhatsapp(phone: string, text: string): string {
  const intl = phone.startsWith("0") ? `9${phone}` : phone;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}
