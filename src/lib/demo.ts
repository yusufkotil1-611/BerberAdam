/**
 * Demo verisi: panelin nasıl göründüğünü görmek için örnek müşteri ve randevular üretir.
 * Üretilen her kayıt is_demo=1 ile işaretlenir ve tek tıkla temizlenebilir.
 * Hepsi TEK atomik toplu işlemde yazılır (yarım kalmaz).
 */
import { BookingError, generateCode } from "./booking";
import { getDb, type Stmt } from "./db";
import { addDays, fromMinutes, shopNow, toMinutes, weekdayOf } from "./time";

// Tekrarlanabilir sonuç için küçük bir sözde-rastgele üretici
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEMO_NAMES = [
  "Ali Yılmaz", "Burak Demir", "Cem Kaya", "Deniz Aydın", "Efe Çelik", "Furkan Şahin", "Gökhan Öztürk",
  "Hakan Arslan", "İbrahim Koç", "Kerem Polat", "Levent Aksoy", "Mert Yıldız", "Onur Güneş", "Selim Erdem",
];

const NOTES = ["", "", "", "", "Yanları kısa olsun.", "Fade, 2 numara.", "Sakal çizgisi belirgin olsun.", "Sakin bir ortam tercih eder."];

export async function seedDemo(): Promise<{ customers: number; appointments: number }> {
  const db = await getDb();
  if (await db.get("SELECT 1 AS x FROM customers WHERE is_demo = 1 LIMIT 1")) {
    throw new BookingError("Demo verisi zaten yüklü. Yeniden yüklemek için önce temizleyin.", 409);
  }

  const rand = mulberry32(20261009);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

  const [services, staff, hoursRows] = await Promise.all([
    db.all<{ id: number; name: string; price: number; duration: number }>("SELECT id, name, price, duration FROM services WHERE active = 1"),
    db.all<{ id: number }>("SELECT id FROM staff WHERE active = 1"),
    db.all<{ weekday: number; is_open: number; open_time: string; close_time: string }>("SELECT * FROM working_hours"),
  ]);
  const hours = new Map(hoursRows.map((h) => [h.weekday, h]));
  if (services.length === 0 || staff.length === 0) throw new BookingError("Önce en az bir hizmet ve personel tanımlayın.", 400);

  const now = shopNow();
  const stmts: Stmt[] = [];
  let apptCount = 0;

  const phones = DEMO_NAMES.map((_, i) => `0500000${String(i + 1).padStart(4, "0")}`); // 05000000001 … (gerçek olmayan numaralar)
  DEMO_NAMES.forEach((name, i) => {
    stmts.push({
      sql: "INSERT INTO customers (name, phone, email, notes, is_demo, created_at) VALUES (?, ?, '', ?, 1, ?)",
      args: [name, phones[i], i % 4 === 0 ? "Düzenli müşteri." : "", `${addDays(now.date, -40)} 10:00:00`],
    });
  });

  for (let offset = -28; offset <= 6; offset++) {
    const date = addDays(now.date, offset);
    const h = hours.get(weekdayOf(date));
    if (!h || !h.is_open) continue;
    const open = toMinutes(h.open_time);
    const close = toMinutes(h.close_time);

    for (const s of staff) {
      let t = open + Math.floor(rand() * 3) * 30;
      while (t < close) {
        // Hizmet seçimi: çoğunlukla tek hizmet, ara sıra kombinasyon
        const chosen = [pick(services)];
        if (rand() < 0.25) {
          const extra = pick(services);
          if (extra.id !== chosen[0].id) chosen.push(extra);
        }
        const duration = chosen.reduce((n, x) => n + x.duration, 0);
        if (t + duration > close) break;

        if (rand() < (offset < 0 ? 0.55 : 0.4)) {
          let status: string;
          if (offset < 0) status = rand() < 0.88 ? "completed" : "cancelled";
          else if (offset === 0) status = t + duration <= now.minutes ? "completed" : rand() < 0.6 ? "confirmed" : "pending";
          else status = rand() < 0.6 ? "confirmed" : "pending";

          const code = generateCode();
          const total = chosen.reduce((n, x) => n + x.price, 0);
          stmts.push({
            sql: `INSERT INTO appointments (code, customer_id, staff_id, date, start_time, end_time, duration, total_price, status, note, is_demo, created_at)
                  VALUES (?, (SELECT id FROM customers WHERE phone = ?), ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
            args: [code, pick(phones), s.id, date, fromMinutes(t), fromMinutes(t + duration), duration, total, status, pick(NOTES), `${addDays(date, -1)} 12:00:00`],
          });
          for (const c of chosen) {
            stmts.push({
              sql: "INSERT INTO appointment_services (appointment_id, service_id, name, price, duration) SELECT id, ?, ?, ?, ? FROM appointments WHERE code = ?",
              args: [c.id, c.name, c.price, c.duration, code],
            });
          }
          apptCount++;
        }
        // Bir sonraki aday saat: bitişten sonra 30 dk grid'ine yuvarla
        t = Math.ceil((t + duration + Math.floor(rand() * 3) * 30) / 30) * 30;
      }
    }
  }

  await db.batch(stmts);
  return { customers: DEMO_NAMES.length, appointments: apptCount };
}

export async function clearDemo(): Promise<void> {
  const db = await getDb();
  await db.batch([
    "DELETE FROM appointments WHERE is_demo = 1",
    "DELETE FROM customers WHERE is_demo = 1",
    "DELETE FROM reviews WHERE is_demo = 1",
    "DELETE FROM notifications WHERE appointment_id IS NULL",
  ]);
}
