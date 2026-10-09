/**
 * Randevu motoru: doluluk (müsaitlik) hesabı, çift rezervasyon engelleme ve randevu oluşturma/durum değiştirme.
 *
 * Çift rezervasyon koruması: kayıt, "bu berberde çakışan randevu YOKSA ekle" koşuluyla TEK atomik toplu
 * işlemde (batch) yapılır. Sunucusuz ortamda aynı anda çalışan birden fazla sunucu örneği olsa bile iki kişi
 * aynı saati alamaz; çakışma durumunda koşullu ekleme 0 satır ekler ve uygulama güncel durumu yeniden hesaplar.
 */
import crypto from "node:crypto";
import { getBookingSettings, getDb, type Arg, type Db, type Stmt } from "./db";
import { SITE } from "./site";
import { addDays, formatDateTR, formatDuration, formatPrice, fromMinutes, isValidDate, shopNow, toMinutes, weekdayOf } from "./time";
import type { AppointmentStatus, AvailabilityResult, BookingConfirmation, Slot } from "./types";

export class BookingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

interface DaySlot extends Slot {
  freeStaffIds: number[];
}
interface DayComputation extends Omit<AvailabilityResult, "slots"> {
  slots: DaySlot[];
}

type Interval = { start: number; end: number; closure: boolean };

/** Bir gün için tüm başlangıç saatlerinin doluluk durumunu hesaplar. */
async function computeDay(db: Db, params: { date: string; staffId: number | null; duration: number }): Promise<DayComputation> {
  const { date, staffId, duration } = params;
  const empty = (message: string): DayComputation => ({ date, open: false, message, slots: [] });

  if (!isValidDate(date)) return empty("Geçersiz tarih.");
  if (!Number.isInteger(duration) || duration <= 0) return empty("Geçersiz hizmet süresi.");

  const now = shopNow();
  if (date < now.date) return empty("Geçmiş bir tarih için randevu alınamaz.");

  // Birbirinden bağımsız sorgular paralel çalışır (bulut veri tabanında gecikmeyi azaltır)
  const [settings, hours, closures, staffRows, booked] = await Promise.all([
    getBookingSettings(db),
    db.get<{ is_open: number; open_time: string; close_time: string }>("SELECT * FROM working_hours WHERE weekday = ?", [weekdayOf(date)]),
    db.all<{ start_time: string | null; end_time: string | null; staff_id: number | null; reason: string }>("SELECT * FROM closures WHERE date = ?", [date]),
    staffId
      ? db.all<{ id: number }>("SELECT id FROM staff WHERE id = ? AND active = 1", [staffId])
      : db.all<{ id: number }>("SELECT id FROM staff WHERE active = 1 ORDER BY sort_order, id"),
    db.all<{ staff_id: number; start_time: string; end_time: string }>(
      "SELECT staff_id, start_time, end_time FROM appointments WHERE date = ? AND status != 'cancelled'",
      [date],
    ),
  ]);

  if (date > addDays(now.date, settings.horizonDays)) {
    return empty(`En fazla ${settings.horizonDays} gün sonrasına randevu alınabilir.`);
  }
  if (!hours || !hours.is_open) return empty("Bu gün kapalıyız.");

  const shopWide = closures.find((c) => c.staff_id === null && !c.start_time);
  if (shopWide) return empty(shopWide.reason ? `Kapalıyız: ${shopWide.reason}` : "Bu gün özel olarak kapalıyız.");
  if (staffRows.length === 0) return empty("Seçilen personel şu an müsait değil.");

  // Personel başına engelli aralıkları hazırla
  const blocked = new Map<number, Interval[]>();
  for (const s of staffRows) {
    const list: Interval[] = [];
    for (const b of booked) {
      if (b.staff_id === s.id) list.push({ start: toMinutes(b.start_time), end: toMinutes(b.end_time), closure: false });
    }
    for (const c of closures) {
      if (c.staff_id !== null && c.staff_id !== s.id) continue;
      list.push({
        start: c.start_time ? toMinutes(c.start_time) : 0,
        end: c.end_time ? toMinutes(c.end_time) : 24 * 60,
        closure: true,
      });
    }
    blocked.set(s.id, list);
  }

  const open = toMinutes(hours.open_time);
  const close = toMinutes(hours.close_time);
  const slots: DaySlot[] = [];

  for (let t = open; t + duration <= close; t += settings.slotStep) {
    const time = fromMinutes(t);
    if (date === now.date && t < now.minutes + settings.minNoticeMinutes) {
      slots.push({ time, available: false, reason: "past", freeStaffIds: [] });
      continue;
    }
    const free: number[] = [];
    let allClosed = true;
    for (const s of staffRows) {
      const overlaps = (blocked.get(s.id) ?? []).filter((iv) => t < iv.end && t + duration > iv.start);
      if (overlaps.length === 0) free.push(s.id);
      else if (overlaps.some((iv) => !iv.closure)) allClosed = false;
    }
    if (free.length > 0) slots.push({ time, available: true, freeStaffIds: free });
    else slots.push({ time, available: false, reason: allClosed ? "closed" : "busy", freeStaffIds: [] });
  }

  return {
    date,
    open: true,
    openTime: hours.open_time,
    closeTime: hours.close_time,
    message: slots.length === 0 ? "Seçilen hizmet süresi için uygun saat yok." : undefined,
    slots,
  };
}

/** Genel API için müsaitlik (personel kimlikleri sızdırılmadan). */
export async function getAvailability(params: { date: string; staffId: number | null; duration: number }): Promise<AvailabilityResult> {
  const day = await computeDay(await getDb(), params);
  return { ...day, slots: day.slots.map(({ time, available, reason }) => ({ time, available, reason })) };
}

// ---------------------------------------------------------------------------
// Randevu oluşturma
// ---------------------------------------------------------------------------
export interface BookingInput {
  serviceIds: number[];
  staffId: number | null;
  date: string;
  time: string;
  name: string;
  phone: string; // normalize edilmiş 05XXXXXXXXX
  email: string;
  note: string;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateCode(): string {
  const bytes = crypto.randomBytes(6);
  return "BA-" + Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

const MAX_ACTIVE_PER_PHONE = 3;

/** "Bu berberde bu aralıkta başka randevu yoksa" koşulu (ekleme ifadelerine WHERE olarak eklenir). */
const NO_OVERLAP = `NOT EXISTS (SELECT 1 FROM appointments WHERE staff_id = ? AND date = ? AND status != 'cancelled' AND start_time < ? AND end_time > ?)`;

export async function createBooking(input: BookingInput): Promise<BookingConfirmation> {
  const db = await getDb();

  // 1) Hizmetler — fiyat ve süre her zaman veri tabanından alınır, istemciye güvenilmez.
  const uniqueIds = [...new Set(input.serviceIds)];
  const services = await db.all<{ id: number; name: string; price: number; duration: number }>(
    `SELECT id, name, price, duration FROM services WHERE active = 1 AND id IN (${uniqueIds.map(() => "?").join(",")})`,
    uniqueIds,
  );
  if (services.length !== uniqueIds.length) throw new BookingError("Seçilen hizmetlerden biri artık mevcut değil.", 400);
  const duration = services.reduce((n, s) => n + s.duration, 0);
  const totalPrice = services.reduce((n, s) => n + s.price, 0);

  // 2) Aynı numaradan aşırı aktif randevuyu engelle (spam / takvimi kilitleme koruması)
  const active = await db.get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM appointments a JOIN customers c ON c.id = a.customer_id
     WHERE c.phone = ? AND a.status IN ('pending','confirmed') AND a.date >= ?`,
    [input.phone, shopNow().date],
  );
  if ((active?.n ?? 0) >= MAX_ACTIVE_PER_PHONE) {
    throw new BookingError(
      `Bu telefon numarasıyla en fazla ${MAX_ACTIVE_PER_PHONE} aktif randevu oluşturulabilir. Lütfen bizi arayın: ${SITE.phoneDisplay}`,
      429,
    );
  }

  const startMin = toMinutes(input.time);
  const endTime = fromMinutes(startMin + duration);
  const when = `${formatDateTR(input.date)} ${input.time}`;
  const serviceNames = services.map((s) => s.name).join(" + ");

  // 3) Doluluğu hesapla → berberi seç → koşullu ekle. Çakışma çıkarsa (başka biri aynı anda aldıysa) yeniden dene.
  for (let attempt = 0; attempt < 3; attempt++) {
    const day = await computeDay(db, { date: input.date, staffId: input.staffId, duration });
    if (!day.open) throw new BookingError(day.message ?? "Seçilen tarih için randevu alınamıyor.", 409);
    const slot = day.slots.find((s) => s.time === input.time);
    if (!slot) throw new BookingError("Seçilen saat bu hizmet süresi için uygun değil.", 409);
    if (!slot.available) throw new BookingError("Üzgünüz, seçtiğiniz saat az önce doldu. Lütfen başka bir saat seçin.", 409);

    // "Fark etmez" → o gün en az randevusu olan müsait berber atanır
    const candidates = input.staffId ? [input.staffId] : slot.freeStaffIds;
    const loads = await db.all<{ id: number; name: string; load: number }>(
      `SELECT s.id, s.name,
              (SELECT COUNT(*) FROM appointments a WHERE a.staff_id = s.id AND a.date = ? AND a.status != 'cancelled') AS load
       FROM staff s WHERE s.id IN (${candidates.map(() => "?").join(",")})`,
      [input.date, ...candidates],
    );
    const staff = loads.sort((a, b) => a.load - b.load)[0];
    if (!staff) throw new BookingError("Seçilen personel şu an müsait değil.", 409);

    const code = generateCode();
    const smsMessage =
      `${SITE.name}: Sayın ${input.name}, ${when} için randevu talebiniz alındı. ` +
      `${serviceNames} (${formatDuration(duration)}, ${formatPrice(totalPrice)}) - ${staff.name}. ` +
      `Kodunuz: ${code}. Onaylandığında SMS ile bilgilendirileceksiniz. ${SITE.phoneDisplay}`;
    const whatsappMessage =
      `Merhaba ${SITE.name}, ${code} kodlu randevumu oluşturdum.\n` +
      `📅 ${when}\n✂️ ${serviceNames}\n👤 ${staff.name}\n💰 ${formatPrice(totalPrice)}\n` +
      `Ad Soyad: ${input.name}`;

    const guardArgs: Arg[] = [staff.id, input.date, endTime, input.time];
    const statements: Stmt[] = [
      // [0] Müşteri (telefona göre tekilleştirilir) — yalnızca saat hâlâ boşsa
      {
        sql: `INSERT INTO customers (name, phone, email) SELECT ?, ?, ? WHERE ${NO_OVERLAP}
              ON CONFLICT(phone) DO UPDATE SET name = excluded.name,
                email = CASE WHEN excluded.email != '' THEN excluded.email ELSE customers.email END`,
        args: [input.name, input.phone, input.email, ...guardArgs],
      },
      // [1] Randevu — yalnızca saat hâlâ boşsa (etkilenen satır sayısı sonucu söyler)
      {
        sql: `INSERT INTO appointments (code, customer_id, staff_id, date, start_time, end_time, duration, total_price, status, note)
              SELECT ?, (SELECT id FROM customers WHERE phone = ?), ?, ?, ?, ?, ?, ?, 'pending', ?
              WHERE ${NO_OVERLAP}`,
        args: [code, input.phone, staff.id, input.date, input.time, endTime, duration, totalPrice, input.note, ...guardArgs],
      },
      // Hizmet kalemleri (fiyat/süre kopyası) ve bildirim günlüğü: randevu eklendiyse eklenir
      ...services.map((s): Stmt => ({
        sql: "INSERT INTO appointment_services (appointment_id, service_id, name, price, duration) SELECT id, ?, ?, ?, ? FROM appointments WHERE code = ?",
        args: [s.id, s.name, s.price, s.duration, code],
      })),
      {
        sql: "INSERT INTO notifications (appointment_id, channel, recipient, message) SELECT id, 'sms', ?, ? FROM appointments WHERE code = ?",
        args: [input.phone, smsMessage, code],
      },
      {
        sql: "INSERT INTO notifications (appointment_id, channel, recipient, message) SELECT id, 'whatsapp', ?, ? FROM appointments WHERE code = ?",
        args: [input.phone, whatsappMessage, code],
      },
    ];

    let results;
    try {
      results = await db.batch(statements);
    } catch (err) {
      // Çok düşük ihtimalle kod çakışması: yeni kodla tekrar dene
      if (/UNIQUE/i.test(String(err)) && /code/i.test(String(err))) continue;
      throw err;
    }
    if (results[1].changes > 0) {
      return {
        code,
        date: input.date,
        startTime: input.time,
        endTime,
        staffName: staff.name,
        customerName: input.name,
        customerPhone: input.phone,
        totalPrice,
        duration,
        services: services.map(({ name, price, duration: d }) => ({ name, price, duration: d })),
        smsMessage,
        whatsappMessage,
      };
    }
    // 0 satır eklendi → o arada başka biri aynı saati aldı; güncel durumla tekrar dene
  }
  throw new BookingError("Üzgünüz, seçtiğiniz saat az önce doldu. Lütfen başka bir saat seçin.", 409);
}

// ---------------------------------------------------------------------------
// Durum güncelleme (admin)
// ---------------------------------------------------------------------------
const STATUS_SMS: Partial<Record<AppointmentStatus, (name: string, when: string, code: string) => string>> = {
  confirmed: (name, when, code) =>
    `${SITE.name}: Sayın ${name}, ${when} randevunuz ONAYLANDI. Sizi bekliyoruz! Kod: ${code}. Adres: ${SITE.addressShort}`,
  cancelled: (name, when, code) =>
    `${SITE.name}: Sayın ${name}, ${when} randevunuz iptal edildi. Yeni randevu için bizi arayın: ${SITE.phoneDisplay}. Kod: ${code}`,
  completed: (name) => `${SITE.name}: Sayın ${name}, bizi tercih ettiğiniz için teşekkürler! Yorumunuzu sitemizden paylaşabilirsiniz.`,
};

export async function updateAppointmentStatus(id: number, status: AppointmentStatus): Promise<void> {
  const db = await getDb();
  const appt = await db.get<{
    id: number;
    code: string;
    staff_id: number;
    date: string;
    start_time: string;
    end_time: string;
    status: AppointmentStatus;
    customer_name: string;
    customer_phone: string;
  }>(
    `SELECT a.*, c.name AS customer_name, c.phone AS customer_phone FROM appointments a
     JOIN customers c ON c.id = a.customer_id WHERE a.id = ?`,
    [id],
  );
  if (!appt) throw new BookingError("Randevu bulunamadı.", 404);
  if (appt.status === status) return;

  // İptal edilmiş bir randevu tekrar aktif edilirse, o arada saat başkasına verilmiş olabilir → koşullu güncelle.
  const reactivating = appt.status === "cancelled" && status !== "cancelled";
  const res = await db.run(
    reactivating
      ? `UPDATE appointments SET status = ? WHERE id = ? AND NOT EXISTS (
           SELECT 1 FROM appointments o WHERE o.staff_id = ? AND o.date = ? AND o.status != 'cancelled'
             AND o.id != ? AND o.start_time < ? AND o.end_time > ?)`
      : "UPDATE appointments SET status = ? WHERE id = ?",
    reactivating ? [status, id, appt.staff_id, appt.date, id, appt.end_time, appt.start_time] : [status, id],
  );
  if (res.changes === 0) throw new BookingError("Bu saat artık başka bir randevuya ait; tekrar aktif edilemez.", 409);

  const template = STATUS_SMS[status];
  if (template) {
    const when = `${formatDateTR(appt.date)} ${appt.start_time}`;
    await db.run("INSERT INTO notifications (appointment_id, channel, recipient, message) VALUES (?, 'sms', ?, ?)", [
      id,
      appt.customer_phone,
      template(appt.customer_name, when, appt.code),
    ]);
  }
}
