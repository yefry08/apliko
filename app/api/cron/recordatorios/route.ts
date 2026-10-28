import { expireHolds, sendReminders } from "@/lib/asesorias";

/**
 * Lo llama el cron de Vercel una vez al día (vercel.json): libera reservas sin pagar y avisa de las sesiones del
 * día siguiente. Con CRON_SECRET definido, Vercel manda "Authorization: Bearer <CRON_SECRET>" y nadie más entra.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  await expireHolds();
  const reminded = await sendReminders();
  return Response.json({ ok: true, reminded });
}
