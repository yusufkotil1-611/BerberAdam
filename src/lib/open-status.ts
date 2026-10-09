import { WEEKDAYS_TR } from "./site";
import { addDays, shopNow, toMinutes, weekdayOf } from "./time";
import type { WorkingHour } from "./types";

export interface OpenStatus {
  open: boolean;
  label: string;
  detail: string;
}

/** Haftalık çalışma saatlerine göre dükkanın şu an açık olup olmadığını (İstanbul saatiyle) hesaplar. */
export function getOpenStatus(hours: WorkingHour[], at: Date = new Date()): OpenStatus {
  const now = shopNow(at);
  const byDay = new Map(hours.map((h) => [h.weekday, h]));
  const today = byDay.get(now.weekday);

  if (today?.isOpen) {
    const open = toMinutes(today.openTime);
    const close = toMinutes(today.closeTime);
    if (now.minutes >= open && now.minutes < close) {
      return { open: true, label: "Şu an açığız", detail: `${today.closeTime}'a kadar` };
    }
    if (now.minutes < open) {
      return { open: false, label: "Şu an kapalı", detail: `Bugün ${today.openTime}'da açılıyoruz` };
    }
  }
  for (let i = 1; i <= 7; i++) {
    const wd = weekdayOf(addDays(now.date, i));
    const h = byDay.get(wd);
    if (h?.isOpen) {
      return { open: false, label: "Şu an kapalı", detail: `${i === 1 ? "Yarın" : WEEKDAYS_TR[wd]} ${h.openTime}'da açılıyoruz` };
    }
  }
  return { open: false, label: "Şu an kapalı", detail: "Çalışma saatleri için bizi arayın" };
}

/** Haftalık saatleri "Pazartesi - Cumartesi: 09:00 - 21:00" gibi gruplanmış metinlere çevirir. */
export function summarizeHours(hours: WorkingHour[]): string {
  // Pazartesi'den başlayarak sırala (1..6, 0)
  const order = [1, 2, 3, 4, 5, 6, 0];
  const byDay = new Map(hours.map((h) => [h.weekday, h]));
  const groups: { from: number; to: number; text: string }[] = [];
  order.forEach((wd, idx) => {
    const h = byDay.get(wd);
    const text = h?.isOpen ? `${h.openTime} - ${h.closeTime}` : "Kapalı";
    const last = groups[groups.length - 1];
    if (last && last.text === text) last.to = idx;
    else groups.push({ from: idx, to: idx, text });
  });
  return groups
    .filter((g) => g.text !== "Kapalı")
    .map((g) => {
      const a = WEEKDAYS_TR[order[g.from]];
      const b = WEEKDAYS_TR[order[g.to]];
      return `${g.from === g.to ? a : `${a} - ${b}`}: ${g.text}`;
    })
    .join(" · ");
}
