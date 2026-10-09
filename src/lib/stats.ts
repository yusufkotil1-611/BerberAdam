/** Admin kontrol paneli istatistikleri. */
import { getDb } from "./db";
import { listAppointments, listNotifications } from "./queries";
import { MONTHS_TR, WEEKDAYS_SHORT_TR } from "./site";
import { addDays, shopNow, weekdayOf } from "./time";
import type { AdminStats, AppointmentStatus, DayRevenue, MonthRevenue } from "./types";

interface AggRow {
  k: string;
  est: number | null;
  real: number | null;
  n: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const db = await getDb();
  const now = shopNow();
  const today = now.date;

  const weekStart = addDays(today, -((weekdayOf(today) + 6) % 7)); // Pazartesi
  const weekEnd = addDays(weekStart, 6);

  const [y, m] = today.split("-").map(Number);
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    monthKeys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }

  // Tüm sorgular birbirinden bağımsız → paralel çalışır
  const [todayRows, customers, pending, upcomingAll, dayRows, monthRows, topServices, demo, notifications] = await Promise.all([
    db.all<{ status: AppointmentStatus; n: number }>("SELECT status, COUNT(*) AS n FROM appointments WHERE date = ? GROUP BY status", [today]),
    db.get<{ n: number }>("SELECT COUNT(*) AS n FROM customers"),
    db.get<{ n: number }>("SELECT COUNT(*) AS n FROM appointments WHERE status = 'pending' AND date >= ?", [today]),
    listAppointments({ from: today, limit: 300 }),
    db.all<AggRow>(
      `SELECT date AS k, SUM(total_price) AS est,
              SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END) AS real, COUNT(*) AS n
       FROM appointments WHERE status != 'cancelled' AND date BETWEEN ? AND ? GROUP BY date`,
      [weekStart, weekEnd],
    ),
    db.all<AggRow>(
      `SELECT substr(date, 1, 7) AS k, SUM(total_price) AS est,
              SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END) AS real, COUNT(*) AS n
       FROM appointments WHERE status != 'cancelled' AND substr(date, 1, 7) BETWEEN ? AND ? GROUP BY k`,
      [monthKeys[0], monthKeys[monthKeys.length - 1]],
    ),
    db.all<{ name: string; count: number; revenue: number }>(
      `SELECT s.name AS name, COUNT(*) AS count, SUM(s.price) AS revenue
       FROM appointment_services s JOIN appointments a ON a.id = s.appointment_id
       WHERE a.status != 'cancelled' GROUP BY s.name ORDER BY count DESC, revenue DESC LIMIT 5`,
    ),
    db.get(
      `SELECT 1 AS x WHERE EXISTS (SELECT 1 FROM customers WHERE is_demo = 1)
                        OR EXISTS (SELECT 1 FROM appointments WHERE is_demo = 1)
                        OR EXISTS (SELECT 1 FROM reviews WHERE is_demo = 1)`,
    ),
    listNotifications(10),
  ]);

  // --- Bugün ---
  const byStatus = (s: AppointmentStatus) => todayRows.find((r) => r.status === s)?.n ?? 0;
  const todayStats = {
    date: today,
    total: todayRows.filter((r) => r.status !== "cancelled").reduce((n, r) => n + r.n, 0),
    pending: byStatus("pending"),
    confirmed: byStatus("confirmed"),
    completed: byStatus("completed"),
    cancelled: byStatus("cancelled"),
  };

  // --- Yaklaşan randevular ---
  const nowTime = `${String(Math.floor(now.minutes / 60)).padStart(2, "0")}:${String(now.minutes % 60).padStart(2, "0")}`;
  const upcoming = upcomingAll
    .filter((a) => (a.status === "pending" || a.status === "confirmed") && (a.date > today || a.endTime >= nowTime))
    .slice(0, 8);

  // --- Haftalık gelir (Pazartesi–Pazar) ---
  const days: DayRevenue[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const r = dayRows.find((x) => x.k === date);
    return {
      date,
      label: WEEKDAYS_SHORT_TR[weekdayOf(date)],
      estimated: r?.est ?? 0,
      realized: r?.real ?? 0,
      count: r?.n ?? 0,
    };
  });
  const weekRevenue = {
    estimated: days.reduce((n, d) => n + d.estimated, 0),
    realized: days.reduce((n, d) => n + d.realized, 0),
  };

  // --- Aylık gelir (son 6 ay) ---
  const months: MonthRevenue[] = monthKeys.map((key) => {
    const r = monthRows.find((x) => x.k === key);
    return {
      month: key,
      label: MONTHS_TR[Number(key.slice(5)) - 1].slice(0, 3),
      estimated: r?.est ?? 0,
      realized: r?.real ?? 0,
      count: r?.n ?? 0,
    };
  });
  const thisMonth = months[months.length - 1];

  return {
    today: todayStats,
    totalCustomers: customers?.n ?? 0,
    pendingAll: pending?.n ?? 0,
    upcoming,
    weekRevenue,
    monthRevenue: { estimated: thisMonth.estimated, realized: thisMonth.realized },
    days,
    months,
    topServices,
    notifications,
    hasDemoData: !!demo,
  };
}
