import { guardAdmin } from "@/lib/auth";
import { getBookingSettings, getDb } from "@/lib/db";
import { handleError, json, parseBody } from "@/lib/http";
import { listWorkingHours } from "@/lib/queries";
import { hoursSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function payload() {
  const [hours, settings] = await Promise.all([listWorkingHours(), getBookingSettings()]);
  return { hours, settings };
}

export async function GET(req: Request) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    return json(await payload());
  } catch (err) {
    return handleError(err);
  }
}

/** PUT — haftalık çalışma saatleri + randevu aralığı / ön bildirim / ufuk ayarları (tek atomik işlem) */
export async function PUT(req: Request) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    const parsed = await parseBody(req, hoursSchema);
    if (parsed.error) return parsed.error;

    const upHours =
      "INSERT INTO working_hours (weekday, is_open, open_time, close_time) VALUES (?, ?, ?, ?) " +
      "ON CONFLICT(weekday) DO UPDATE SET is_open = excluded.is_open, open_time = excluded.open_time, close_time = excluded.close_time";
    const upSetting = "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value";
    const { settings } = parsed.data;

    const db = await getDb();
    await db.batch([
      ...parsed.data.hours.map((h) => ({ sql: upHours, args: [h.weekday, h.isOpen ? 1 : 0, h.openTime, h.closeTime] })),
      { sql: upSetting, args: ["slot_step", String(settings.slotStep)] },
      { sql: upSetting, args: ["min_notice_minutes", String(settings.minNoticeMinutes)] },
      { sql: upSetting, args: ["horizon_days", String(settings.horizonDays)] },
    ]);
    return json(await payload());
  } catch (err) {
    return handleError(err);
  }
}
