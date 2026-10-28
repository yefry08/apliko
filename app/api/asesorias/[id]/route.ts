import { bookingById, BookingError, cancelBooking } from "@/lib/asesorias";
import { getSessionUserId } from "@/lib/auth";
import { accountOf, roleOf } from "@/lib/roles";

/** DELETE: cancelar. El usuario cancela la suya mientras no esté pagada; el asesor o el super admin, cualquiera. */

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId(request);
  if (!userId) return Response.json({ error: "Sin sesión" }, { status: 401 });
  const booking = await bookingById((await params).id);
  if (!booking) return Response.json({ error: "No existe" }, { status: 404 });

  const [role, account] = await Promise.all([roleOf(userId), accountOf(userId)]);
  const isAdvisor = role !== "usuario" && account?.email === booking.advisor;
  const isOwner = booking.userId === userId;
  if (!isAdvisor && role !== "superadmin" && !isOwner) return Response.json({ error: "No es tuya" }, { status: 403 });

  try {
    await cancelBooking(booking, isAdvisor || role === "superadmin" ? "asesor" : "usuario");
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof BookingError) return Response.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
