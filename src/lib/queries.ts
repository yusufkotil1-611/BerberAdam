/**
 * Okuma sorguları: veri tabanı satırlarını (snake_case) API/istemci tiplerine (camelCase) dönüştürür.
 */
import { getDb, type Arg, type Row } from "./db";
import type {
  AppointmentStatus,
  AppointmentView,
  Closure,
  CustomerView,
  NotificationLog,
  Review,
  Service,
  Staff,
  WorkingHour,
} from "./types";

// ---------------------------------------------------------------------------
// Hizmetler / Personel / Saatler
// ---------------------------------------------------------------------------
const mapService = (r: Row): Service => ({
  id: r.id as number,
  name: r.name as string,
  description: r.description as string,
  price: r.price as number,
  duration: r.duration as number,
  icon: r.icon as string,
  popular: !!r.popular,
  active: !!r.active,
  sortOrder: r.sort_order as number,
});

export async function listServices(onlyActive = false): Promise<Service[]> {
  const db = await getDb();
  const rows = await db.all(`SELECT * FROM services ${onlyActive ? "WHERE active = 1" : ""} ORDER BY sort_order, id`);
  return rows.map(mapService);
}

const mapStaff = (r: Row): Staff => ({
  id: r.id as number,
  name: r.name as string,
  title: r.title as string,
  active: !!r.active,
  sortOrder: r.sort_order as number,
});

export async function listStaff(onlyActive = false): Promise<Staff[]> {
  const db = await getDb();
  const rows = await db.all(`SELECT * FROM staff ${onlyActive ? "WHERE active = 1" : ""} ORDER BY sort_order, id`);
  return rows.map(mapStaff);
}

export async function listWorkingHours(): Promise<WorkingHour[]> {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM working_hours ORDER BY weekday");
  return rows.map((r) => ({
    weekday: r.weekday as number,
    isOpen: !!r.is_open,
    openTime: r.open_time as string,
    closeTime: r.close_time as string,
  }));
}

// ---------------------------------------------------------------------------
// Kapalı günler
// ---------------------------------------------------------------------------
export async function listClosures(fromDate?: string): Promise<Closure[]> {
  const db = await getDb();
  const rows = await db.all(
    `SELECT c.*, s.name AS staff_name FROM closures c
     LEFT JOIN staff s ON s.id = c.staff_id
     ${fromDate ? "WHERE c.date >= ?" : ""}
     ORDER BY c.date, c.start_time`,
    fromDate ? [fromDate] : [],
  );
  return rows.map((r) => ({
    id: r.id as number,
    date: r.date as string,
    startTime: (r.start_time as string | null) ?? null,
    endTime: (r.end_time as string | null) ?? null,
    staffId: (r.staff_id as number | null) ?? null,
    staffName: (r.staff_name as string | null) ?? null,
    reason: r.reason as string,
  }));
}

// ---------------------------------------------------------------------------
// Yorumlar
// ---------------------------------------------------------------------------
export async function listReviews(onlyApproved = true, limit = 100): Promise<Review[]> {
  const db = await getDb();
  const rows = await db.all(
    `SELECT * FROM reviews ${onlyApproved ? "WHERE approved = 1" : ""} ORDER BY created_at DESC, id DESC LIMIT ?`,
    [limit],
  );
  return rows.map((r) => ({
    id: r.id as number,
    name: r.name as string,
    rating: r.rating as number,
    comment: r.comment as string,
    createdAt: r.created_at as string,
    approved: !!r.approved,
    isDemo: !!r.is_demo,
  }));
}

export async function reviewStats(): Promise<{ average: number; count: number }> {
  const db = await getDb();
  const row = await db.get<{ n: number; avg: number | null }>("SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE approved = 1");
  return { average: row?.avg ? Math.round(row.avg * 10) / 10 : 0, count: row?.n ?? 0 };
}

// ---------------------------------------------------------------------------
// Randevular
// ---------------------------------------------------------------------------
export interface AppointmentFilter {
  from?: string;
  to?: string;
  status?: AppointmentStatus | null;
  q?: string;
  customerId?: number;
  limit?: number;
}

const APPT_SELECT = `SELECT a.*, s.name AS staff_name, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
       FROM appointments a
       JOIN staff s ON s.id = a.staff_id
       JOIN customers c ON c.id = a.customer_id`;

export async function listAppointments(filter: AppointmentFilter = {}): Promise<AppointmentView[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: Arg[] = [];
  if (filter.from) {
    where.push("a.date >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    where.push("a.date <= ?");
    params.push(filter.to);
  }
  if (filter.status) {
    where.push("a.status = ?");
    params.push(filter.status);
  }
  if (filter.customerId) {
    where.push("a.customer_id = ?");
    params.push(filter.customerId);
  }
  if (filter.q) {
    const like = `%${filter.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    where.push("(c.name LIKE ? ESCAPE '\\' OR c.phone LIKE ? ESCAPE '\\' OR a.code LIKE ? ESCAPE '\\')");
    params.push(like, like, like);
  }
  params.push(filter.limit ?? 1000);

  const rows = await db.all(
    `${APPT_SELECT}
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY a.date, a.start_time, a.id
     LIMIT ?`,
    params,
  );
  return attachServices(rows);
}

export async function getAppointment(id: number): Promise<AppointmentView | null> {
  const db = await getDb();
  const row = await db.get(`${APPT_SELECT} WHERE a.id = ?`, [id]);
  return row ? (await attachServices([row]))[0] : null;
}

async function attachServices(rows: Row[]): Promise<AppointmentView[]> {
  if (rows.length === 0) return [];
  const db = await getDb();
  const ids = rows.map((r) => r.id as number);
  const byAppt = new Map<number, { name: string; price: number; duration: number }[]>();

  // Değişken sınırına takılmamamak için parçalara böl; parçalar paralel çalışır
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += 400) chunks.push(ids.slice(i, i + 400));
  const results = await Promise.all(
    chunks.map((chunk) =>
      db.all(
        `SELECT appointment_id, name, price, duration FROM appointment_services
         WHERE appointment_id IN (${chunk.map(() => "?").join(",")}) ORDER BY rowid`,
        chunk,
      ),
    ),
  );
  for (const svcRows of results) {
    for (const s of svcRows) {
      const list = byAppt.get(s.appointment_id as number) ?? [];
      list.push({ name: s.name as string, price: s.price as number, duration: s.duration as number });
      byAppt.set(s.appointment_id as number, list);
    }
  }

  return rows.map((r) => ({
    id: r.id as number,
    code: r.code as string,
    date: r.date as string,
    startTime: r.start_time as string,
    endTime: r.end_time as string,
    duration: r.duration as number,
    totalPrice: r.total_price as number,
    status: r.status as AppointmentStatus,
    note: r.note as string,
    createdAt: r.created_at as string,
    isDemo: !!r.is_demo,
    staffId: r.staff_id as number,
    staffName: r.staff_name as string,
    customerId: r.customer_id as number,
    customerName: r.customer_name as string,
    customerPhone: r.customer_phone as string,
    customerEmail: r.customer_email as string,
    services: byAppt.get(r.id as number) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Müşteriler
// ---------------------------------------------------------------------------
export async function listCustomers(): Promise<CustomerView[]> {
  const db = await getDb();
  const rows = await db.all(
    `SELECT c.*,
       COALESCE(SUM(a.status = 'completed'), 0)  AS visit_count,
       COALESCE(SUM(a.status != 'cancelled'), 0) AS total_appointments,
       COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.total_price END), 0) AS total_spent,
       MAX(CASE WHEN a.status = 'completed' THEN a.date END) AS last_visit
     FROM customers c
     LEFT JOIN appointments a ON a.customer_id = c.id
     GROUP BY c.id
     ORDER BY visit_count DESC, total_appointments DESC, c.created_at DESC`,
  );
  return rows.map((r) => ({
    id: r.id as number,
    name: r.name as string,
    phone: r.phone as string,
    email: r.email as string,
    notes: r.notes as string,
    createdAt: r.created_at as string,
    isDemo: !!r.is_demo,
    visitCount: r.visit_count as number,
    totalAppointments: r.total_appointments as number,
    totalSpent: r.total_spent as number,
    lastVisit: (r.last_visit as string | null) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Bildirim günlüğü
// ---------------------------------------------------------------------------
export async function listNotifications(limit = 12): Promise<NotificationLog[]> {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM notifications ORDER BY id DESC LIMIT ?", [limit]);
  return rows.map((r) => ({
    id: r.id as number,
    appointmentId: (r.appointment_id as number | null) ?? null,
    channel: r.channel as "sms" | "whatsapp",
    recipient: r.recipient as string,
    message: r.message as string,
    createdAt: r.created_at as string,
  }));
}
