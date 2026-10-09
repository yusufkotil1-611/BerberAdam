/**
 * Marka ve iletişim bilgileri — tek yerden yönetilir.
 * (Fiyat, hizmet, saat gibi dinamik içerikler veri tabanından gelir.)
 */
export const SITE = {
  name: "BERBERADAM",
  tagline: "Stilini ustalara emanet et",
  description:
    "BERBERADAM Erenler/Sakarya — saç kesimi, sakal şekillendirme, cilt bakımı ve VIP paketlerle modern erkek kuaförü. Online randevu al.",
  phoneDisplay: "0543 370 01 37",
  phoneRaw: "05433700137",
  phoneTel: "tel:05433700137",
  /** WhatsApp için uluslararası biçim (90 + numara) */
  whatsappNumber: "905433700137",
  address: "Hanlı Merkez, Erenler Cd. 20-c, 54100 Erenler/Sakarya",
  addressShort: "Hanlı Merkez, Erenler / Sakarya",
  timezone: "Europe/Istanbul",
} as const;

export function whatsappLink(text?: string): string {
  const base = `https://wa.me/${SITE.whatsappNumber}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export const MAPS_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(SITE.address)}&output=embed`;
export const MAPS_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(SITE.address)}`;
export const MAPS_VIEW_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.address)}`;

export const WEEKDAYS_TR = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"] as const;
export const WEEKDAYS_SHORT_TR = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"] as const;
export const MONTHS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
] as const;

export const STATUS_LABELS = {
  pending: "Bekleyen",
  confirmed: "Onaylanan",
  completed: "Tamamlanan",
  cancelled: "İptal Edilen",
} as const;
export type AppointmentStatus = keyof typeof STATUS_LABELS;

/** Sadakat programı: kaç tıraşta bir hediye */
export const LOYALTY_TARGET = 5;
