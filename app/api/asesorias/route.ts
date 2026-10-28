import { advisorBySlug, BookingError, createBooking, freeSlots } from "@/lib/asesorias";
import { getSessionUserId } from "@/lib/auth";
import { accountOf } from "@/lib/roles";

/** GET ?asesor=slug: horarios libres (público). POST: reservar uno (con sesión y email verificado). */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const advisor = advisorBySlug(new URL(request.url).searchParams.get("asesor") ?? "");
  if (!advisor) return Response.json({ error: "Ese asesor no existe" }, { status: 404 });
  return Response.json({ slots: await freeSlots(advisor) });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId(request);
  if (!userId) return Response.json({ error: "Entra a tu cuenta para reservar." }, { status: 401 });
  const account = await accountOf(userId);
  if (!account?.email || !account.verified) {
    return Response.json({ error: "Verifica tu email antes de reservar: ahí te llega la solicitud de pago." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { asesor?: unknown; inicio?: unknown; tema?: unknown } | null;
  const asesor = typeof body?.asesor === "string" ? body.asesor : "";
  const inicio = typeof body?.inicio === "string" ? body.inicio : "";
  const tema = typeof body?.tema === "string" ? body.tema : "";
  try {
    const booking = await createBooking({ id: userId, email: account.email, name: account.name }, asesor, inicio, tema);
    return Response.json({ booking });
  } catch (error) {
    if (error instanceof BookingError) return Response.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
