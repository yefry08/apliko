import { advisorByEmail } from "@/lib/asesores";
import { bookingsOfUser } from "@/lib/asesorias";
import { getSessionUserId } from "@/lib/auth";

/** Las asesorías del usuario con sesión, con el nombre del asesor (nunca su email). */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getSessionUserId(request);
  if (!userId) return Response.json({ error: "Sin sesión" }, { status: 401 });
  const bookings = await bookingsOfUser(userId);
  return Response.json({
    bookings: bookings.map((b) => {
      const a = advisorByEmail(b.advisor);
      return {
        id: b.id,
        advisorName: a?.name ?? "ApliKo",
        startsAt: b.startsAt,
        topic: b.topic,
        priceUsd: b.priceUsd,
        status: b.status,
        holdUntil: b.holdUntil,
        meetUrl: b.meetUrl,
      };
    }),
  });
}
