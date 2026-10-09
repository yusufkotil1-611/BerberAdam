/** Tüm API girdileri için zod doğrulama şemaları (Türkçe hata mesajlarıyla). */
import { z } from "zod";
import { SERVICE_ICON_KEYS } from "./service-icons";
import { isValidDate, normalizePhone, TIME_RE, toMinutes } from "./time";

// Açıkça mesaj verilmeyen (tip/aralık) hatalar için Türkçe, kullanıcı dostu varsayılan
z.config({ customError: () => "Girilen bilgilerde eksik veya hatalı alan var." });

const time = z.string().regex(TIME_RE, "Saat HH:MM biçiminde olmalı.");
const date = z.string().refine(isValidDate, "Geçersiz tarih.");

const email = z
  .string()
  .trim()
  .max(120, "E-posta çok uzun.")
  .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), "Geçerli bir e-posta adresi girin.")
  .default("");

// ---------- Genel (müşteri) ----------
export const bookingSchema = z.object({
  serviceIds: z.array(z.number().int().positive()).min(1, "En az bir hizmet seçin.").max(8, "En fazla 8 hizmet seçilebilir."),
  staffId: z.number().int().positive().nullable(),
  date,
  time,
  name: z.string().trim().min(3, "Lütfen adınızı ve soyadınızı girin.").max(80, "Ad çok uzun."),
  phone: z
    .string()
    .refine((v) => normalizePhone(v) !== null, "Geçerli bir cep telefonu girin (05XX XXX XX XX).")
    .transform((v) => normalizePhone(v) as string),
  email,
  note: z.string().trim().max(500, "Not en fazla 500 karakter olabilir.").default(""),
});

export const reviewSchema = z.object({
  name: z.string().trim().min(2, "Lütfen adınızı girin.").max(40, "Ad çok uzun."),
  rating: z.number().int().min(1, "Puan seçin.").max(5),
  comment: z.string().trim().min(5, "Yorum en az 5 karakter olmalı.").max(500, "Yorum en fazla 500 karakter olabilir."),
});

// ---------- Admin ----------
export const loginSchema = z.object({ password: z.string().min(1, "Şifre girin.").max(128) });

export const passwordChangeSchema = z.object({
  oldPassword: z.string().min(1, "Mevcut şifrenizi girin.").max(128),
  newPassword: z.string().min(6, "Yeni şifre en az 6 karakter olmalı.").max(128, "Şifre çok uzun."),
});

export const statusSchema = z.object({ status: z.enum(["pending", "confirmed", "completed", "cancelled"]) });

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Hizmet adı en az 2 karakter olmalı.").max(60),
  description: z.string().trim().max(200, "Açıklama en fazla 200 karakter olabilir.").default(""),
  price: z.number().int("Fiyat tam sayı olmalı.").min(0).max(100000),
  duration: z.number().int("Süre tam sayı olmalı.").min(5, "Süre en az 5 dk olmalı.").max(600),
  icon: z.enum(SERVICE_ICON_KEYS).default("scissors"),
  popular: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const staffSchema = z.object({
  name: z.string().trim().min(2, "İsim en az 2 karakter olmalı.").max(60),
  title: z.string().trim().max(80).default(""),
  active: z.boolean().default(true),
});

export const hoursSchema = z.object({
  hours: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        isOpen: z.boolean(),
        openTime: time,
        closeTime: time,
      }),
    )
    .length(7, "7 günün tamamı gönderilmeli.")
    .refine((rows) => new Set(rows.map((r) => r.weekday)).size === 7, "Her gün bir kez bulunmalı.")
    .refine((rows) => rows.every((r) => !r.isOpen || toMinutes(r.openTime) < toMinutes(r.closeTime)), {
      message: "Açılış saati kapanış saatinden önce olmalı.",
    }),
  settings: z.object({
    slotStep: z.number().int().refine((n) => [10, 15, 20, 30, 45, 60].includes(n), "Geçersiz randevu aralığı."),
    minNoticeMinutes: z.number().int().min(0).max(1440),
    horizonDays: z.number().int().min(1).max(180),
  }),
});

export const closureSchema = z
  .object({
    date,
    startTime: time.nullable().default(null),
    endTime: time.nullable().default(null),
    staffId: z.number().int().positive().nullable().default(null),
    reason: z.string().trim().max(100).default(""),
  })
  .refine((c) => (c.startTime === null) === (c.endTime === null), "Başlangıç ve bitiş saatini birlikte girin.")
  .refine((c) => c.startTime === null || toMinutes(c.startTime) < toMinutes(c.endTime as string), "Bitiş saati başlangıçtan sonra olmalı.");

export const customerPatchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), "Geçerli bir e-posta adresi girin.")
    .optional(),
  notes: z.string().trim().max(1000, "Not en fazla 1000 karakter olabilir.").optional(),
});

export const reviewPatchSchema = z.object({ approved: z.boolean() });

export const demoSchema = z.object({ action: z.enum(["seed", "clear"]) });
