/**
 * Tarih/saat yardımcıları. Dükkanın saati her zaman Europe/Istanbul'dur;
 * tarihler 'YYYY-MM-DD', saatler 'HH:MM' metni olarak saklanır.
 */
import { MONTHS_TR, SITE, WEEKDAYS_TR } from "./site";

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 0 = Pazar … 6 = Cumartesi */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** İstanbul saatine göre şu an: { date, minutes, weekday } */
export function shopNow(now: Date = new Date()): { date: string; minutes: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  return { date, minutes: Number(get("hour")) * 60 + Number(get("minute")), weekday: weekdayOf(date) };
}

/** "9 Ekim Cuma" gibi okunaklı tarih */
export function formatDateTR(date: string, withWeekday = true): string {
  const d = new Date(`${date}T00:00:00Z`);
  const base = `${d.getUTCDate()} ${MONTHS_TR[d.getUTCMonth()]}`;
  return withWeekday ? `${base} ${WEEKDAYS_TR[d.getUTCDay()]}` : base;
}

export function formatPrice(value: number): string {
  return `${new Intl.NumberFormat("tr-TR").format(value)} ₺`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} sa ${m} dk` : `${h} sa`;
}

/** Telefonu 05XXXXXXXXX biçimine getirir; geçersizse null döner. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) digits = `0${digits.slice(2)}`;
  else if (digits.length === 10 && digits.startsWith("5")) digits = `0${digits}`;
  return /^05\d{9}$/.test(digits) ? digits : null;
}

export function formatPhone(phone: string): string {
  return phone.length === 11 ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7, 9)} ${phone.slice(9)}` : phone;
}
