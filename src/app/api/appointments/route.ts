import { createBooking } from "@/lib/booking";
import { fail, handleError, json, parseBody } from "@/lib/http";
import { clientIp, hit } from "@/lib/rate-limit";
import { bookingSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** POST /api/appointments — müşteri randevu oluşturur (hizmetler, saat ve fiyat sunucuda yeniden doğrulanır). */
export async function POST(req: Request) {
  try {
    const limit = await hit(`book:${clientIp(req)}`, 6, 10 * 60_000);
    if (!limit.ok) return fail("Kısa sürede çok fazla randevu denemesi yaptınız. Lütfen daha sonra tekrar deneyin.", 429);

    const parsed = await parseBody(req, bookingSchema);
    if (parsed.error) return parsed.error;

    const confirmation = await createBooking(parsed.data);
    return json(confirmation, 201);
  } catch (err) {
    return handleError(err);
  }
}
