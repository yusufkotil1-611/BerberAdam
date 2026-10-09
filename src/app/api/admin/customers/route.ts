import { guardAdmin } from "@/lib/auth";
import { handleError, json } from "@/lib/http";
import { listCustomers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const denied = await guardAdmin(req);
    if (denied) return denied;
    return json({ customers: await listCustomers() });
  } catch (err) {
    return handleError(err);
  }
}
