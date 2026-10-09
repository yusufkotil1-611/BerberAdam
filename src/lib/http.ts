/** API rotaları için küçük yardımcılar. */
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { BookingError } from "./booking";

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Gövdeyi okur ve zod şemasıyla doğrular. Hata varsa hazır bir yanıt döner. */
export async function parseBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<{ data: T; error?: undefined } | { data?: undefined; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: fail("Geçersiz istek gövdesi.", 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: fail(first?.message || "Geçersiz veri.", 400) };
  }
  return { data: parsed.data };
}

/** Rota içinde fırlatılan hataları kullanıcı dostu yanıta çevirir. */
export function handleError(err: unknown) {
  if (err instanceof BookingError) return fail(err.message, err.status);
  console.error("[API HATASI]", err);
  return fail("Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.", 500);
}

export function parseId(value: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}
