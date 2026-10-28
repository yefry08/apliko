import { ADVISORS, advisorByEmail } from "@/lib/asesores";
import {
  availabilityOf,
  bookingById,
  BookingError,
  bookingsForAdmin,
  cancelBooking,
  confirmBooking,
  setAvailability,
  type Range,
} from "@/lib/asesorias";
import { mailConfigured } from "@/lib/correo";
import { accountOf, sessionRole } from "@/lib/roles";

/**
 * Asesorías en /admin. GET: mi disponibilidad y mis reservas (el super admin ve todas). PUT: guardar mi
 * disponibilidad. POST { id, accion: "confirmar", meet } o { id, accion: "cancelar" }.
 */

export const dynamic = "force-dynamic";

async function adminSession(request: Request) {
  const session = await sessionRole(request);
  if (!session || session.role === "usuario") return null;
  const account = await accountOf(session.userId);
  const email = account?.email ?? null;
  return { ...session, email, advisor: email ? advisorByEmail(email) : null };
}

export async function GET(request: Request) {
  const admin = await adminSession(request);
  if (!admin) return Response.json({ error: "Solo para admins" }, { status: 403 });
  const [availability, bookings] = await Promise.all([
    admin.advisor ? availabilityOf(admin.advisor.email) : Promise.resolve([]),
    bookingsForAdmin(admin.role === "superadmin" ? null : (admin.email ?? "-")),
  ]);
  return Response.json({
    isAdvisor: Boolean(admin.advisor),
    mailConfigured,
    availability,
    bookings: bookings.map((b) => ({ ...b, advisorName: advisorByEmail(b.advisor)?.name ?? b.advisor })),
    advisors: ADVISORS.map((a) => a.name),
  });
}

export async function PUT(request: Request) {
  const admin = await adminSession(request);
  if (!admin?.advisor) return Response.json({ error: "Tu cuenta no es de un asesor del equipo" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { ranges?: Range[] } | null;
  if (!Array.isArray(body?.ranges)) return Response.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    await setAvailability(admin.advisor.email, body.ranges);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const admin = await adminSession(request);
  if (!admin) return Response.json({ error: "Solo para admins" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { id?: unknown; accion?: unknown; meet?: unknown } | null;
  const booking = await bookingById(typeof body?.id === "string" ? body.id : "");
  if (!booking) return Response.json({ error: "No existe" }, { status: 404 });
  if (admin.role !== "superadmin" && booking.advisor !== admin.email) {
    return Response.json({ error: "Esa reserva es de otro asesor" }, { status: 403 });
  }
  try {
    if (body?.accion === "confirmar") await confirmBooking(booking, typeof body.meet === "string" ? body.meet : "");
    else if (body?.accion === "cancelar") await cancelBooking(booking, "asesor");
    else return Response.json({ error: "Acción inválida" }, { status: 400 });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof BookingError) return Response.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
