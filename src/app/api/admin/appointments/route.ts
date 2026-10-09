import { guardAdmin } from "@/lib/auth";
import { fail, handleError, json } from "@/lib/http";
import { listAppointments } from "@/lib/queries";
import { isValidDate } from "@/lib/time";
import type { AppointmentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: AppointmentStatus[] = ["pending", "confirmed", "completed", "cancelled"];

/** GET /api/admin/appointments?from=&to=&status=&q= */
export async function GET(req: Request) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;

    const p = new URL(req.url).searchParams;
    const from = p.get("from") || undefined;
    const to = p.get("to") || undefined;
    const status = p.get("status") as AppointmentStatus | null;
    if ((from && !isValidDate(from)) || (to && !isValidDate(to))) return fail("Geçersiz tarih.", 400);
    if (status && !STATUSES.includes(status)) return fail("Geçersiz durum.", 400);

    const q = (p.get("q") ?? "").trim().slice(0, 60);
    return json({ appointments: await listAppointments({ from, to, status, q: q || undefined, limit: 2000 }) });
  } catch (err) {
    return handleError(err);
  }
}
