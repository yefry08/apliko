import "server-only";
import { advisorByEmail, advisorBySlug, type Advisor } from "./asesores";
import { sendMail } from "./correo";
import { getSql } from "./db";
import { SESSION } from "./equipo";

/**
 * Asesorías 1-1. El usuario reserva un horario libre; queda "pendiente de pago" mientras el asesor le manda una
 * solicitud de pago de Payoneer (a mano: una cuenta normal de Payoneer no tiene API). Cuando llega el pago, el
 * asesor la marca pagada en /admin con su enlace de Google Meet y queda confirmada.
 *
 * Las horas viven en hora de Santo Domingo, UTC-4 todo el año.
 */

const DR_OFFSET_MIN = 240;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
/** Lead time so there is room to send and pay the Payoneer request. */
export const LEAD_HOURS = 24;
export const WINDOW_DAYS = 14;
const HOLD_HOURS = 48;
const MAX_PENDING_PER_USER = 3;
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aplik0.vercel.app";

export type BookingStatus = "pendiente_pago" | "confirmada" | "cancelada";

export interface Range {
  weekday: number;
  start: number;
  end: number;
}

export interface Booking {
  id: string;
  userId: string;
  advisor: string;
  userEmail: string;
  userName: string | null;
  startsAt: string;
  endsAt: string;
  topic: string;
  priceUsd: number;
  status: BookingStatus;
  holdUntil: string;
  meetUrl: string | null;
}

export const drDate = (iso: string | Date) =>
  new Date(iso).toLocaleString("es-DO", {
    timeZone: "America/Santo_Domingo",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });

const toBooking = (r: Record<string, unknown>): Booking => ({
  id: r.id as string,
  userId: r.user_id as string,
  advisor: r.advisor as string,
  userEmail: r.user_email as string,
  userName: (r.user_name as string | null) ?? null,
  startsAt: new Date(r.starts_at as string).toISOString(),
  endsAt: new Date(r.ends_at as string).toISOString(),
  topic: r.topic as string,
  priceUsd: Number(r.price_usd),
  status: r.status as BookingStatus,
  holdUntil: new Date(r.hold_until as string).toISOString(),
  meetUrl: (r.meet_url as string | null) ?? null,
});

function db() {
  const sql = getSql();
  if (!sql) throw new Error("Falta DATABASE_URL");
  return sql;
}

/** Unpaid bookings past their hold free their slot. */
export async function expireHolds() {
  await db()`update public.bookings set status = 'cancelada', cancelled_at = now()
             where status = 'pendiente_pago' and hold_until < now()`;
}

export async function availabilityOf(email: string): Promise<Range[]> {
  const rows = await db()`select weekday, start_minute, end_minute from public.availability
                          where advisor = ${email} order by weekday, start_minute`;
  return rows.map((r) => ({ weekday: Number(r.weekday), start: Number(r.start_minute), end: Number(r.end_minute) }));
}

/** Free 30-minute slots (UTC ISO strings) from LEAD_HOURS ahead to WINDOW_DAYS out. */
export async function freeSlots(advisor: Advisor): Promise<string[]> {
  await expireHolds();
  const [ranges, taken] = await Promise.all([
    availabilityOf(advisor.email),
    db()`select starts_at from public.bookings
         where advisor = ${advisor.email} and status in ('pendiente_pago', 'confirmada') and starts_at > now()`,
  ]);
  const busy = new Set(taken.map((r) => new Date(r.starts_at as string).getTime()));
  const earliest = Date.now() + LEAD_HOURS * HOUR;
  // Midnight today in Santo Domingo, as a UTC timestamp.
  const drNow = new Date(Date.now() - DR_OFFSET_MIN * MINUTE);
  const today = Date.UTC(drNow.getUTCFullYear(), drNow.getUTCMonth(), drNow.getUTCDate());

  const slots: string[] = [];
  for (let day = 0; day <= WINDOW_DAYS; day++) {
    const midnight = today + day * 24 * HOUR;
    const weekday = new Date(midnight).getUTCDay();
    for (const r of ranges.filter((x) => x.weekday === weekday)) {
      for (let m = r.start; m + SESSION.minutes <= r.end; m += SESSION.minutes) {
        const start = midnight + (m + DR_OFFSET_MIN) * MINUTE;
        if (start >= earliest && !busy.has(start)) slots.push(new Date(start).toISOString());
      }
    }
  }
  return slots.sort();
}

export async function setAvailability(email: string, ranges: Range[]) {
  const clean = ranges.filter(
    (r) =>
      Number.isInteger(r.weekday) && r.weekday >= 0 && r.weekday <= 6 &&
      Number.isInteger(r.start) && Number.isInteger(r.end) &&
      r.start >= 0 && r.end <= 1440 && r.end - r.start >= SESSION.minutes &&
      r.start % SESSION.minutes === 0 && r.end % SESSION.minutes === 0,
  );
  if (clean.length !== ranges.length || clean.length > 50) throw new Error("Revisa los horarios: bloques de 30 minutos.");
  const sql = db();
  await sql.transaction([
    sql`delete from public.availability where advisor = ${email}`,
    ...clean.map(
      (r) => sql`insert into public.availability (advisor, weekday, start_minute, end_minute)
                 values (${email}, ${r.weekday}, ${r.start}, ${r.end})`,
    ),
  ]);
}

export class BookingError extends Error {}

export async function createBooking(
  user: { id: string; email: string; name: string | null },
  advisorSlug: string,
  startsAt: string,
  topic: string,
): Promise<Booking> {
  const advisor = advisorBySlug(advisorSlug);
  if (!advisor) throw new BookingError("Ese asesor no existe.");
  if (advisor.email === user.email.toLowerCase()) throw new BookingError("No puedes reservar contigo.");
  if (topic.length > 1000) throw new BookingError("El tema es muy largo (máximo 1000 caracteres).");

  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime()) || !(await freeSlots(advisor)).includes(start.toISOString())) {
    throw new BookingError("Ese horario ya no está libre. Elige otro.");
  }
  const sql = db();
  const [{ pending }] = await sql`select count(*)::int as pending from public.bookings
                                  where user_id = ${user.id} and status = 'pendiente_pago'`;
  if (pending >= MAX_PENDING_PER_USER) {
    throw new BookingError(`Ya tienes ${pending} reservas sin pagar. Paga o cancela una antes de reservar otra.`);
  }

  const end = new Date(start.getTime() + SESSION.minutes * MINUTE);
  const holdUntil = new Date(Math.min(Date.now() + HOLD_HOURS * HOUR, start.getTime() - 2 * HOUR));
  let row;
  try {
    [row] = await sql`
      insert into public.bookings (user_id, user_email, user_name, advisor, starts_at, ends_at, topic, price_usd, hold_until)
      values (${user.id}, ${user.email.toLowerCase()}, ${user.name}, ${advisor.email}, ${start.toISOString()},
              ${end.toISOString()}, ${topic.trim()}, ${SESSION.priceUsd}, ${holdUntil.toISOString()})
      returning *`;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new BookingError("Alguien acaba de reservar ese horario. Elige otro.");
    throw error;
  }
  const booking = toBooking(row);

  const when = drDate(booking.startsAt);
  const who = booking.userName ? `${booking.userName} (${booking.userEmail})` : booking.userEmail;
  await Promise.all([
    sendMail(
      booking.userEmail,
      `Reservaste una asesoría con ${advisor.name}`,
      [
        `Hola${booking.userName ? ` ${booking.userName}` : ""}:`,
        "",
        `Apartaste una asesoría de ${SESSION.minutes} minutos con ${advisor.name} (${advisor.role} de ApliKo)`,
        `el ${when}, hora de República Dominicana.`,
        "",
        `Para confirmarla, paga USD ${SESSION.priceUsd} con la solicitud de pago de Payoneer que te llegará a este correo.`,
        `Tienes hasta el ${drDate(booking.holdUntil)}; si no se paga a tiempo, el horario se libera.`,
        "",
        `Tus sesiones: ${SITE}/asesorias`,
      ].join("\n"),
    ),
    sendMail(
      advisor.email,
      `Nueva asesoría: ${who}, ${when}`,
      [
        `${who} reservó una asesoría contigo el ${when} (hora de RD).`,
        booking.topic ? `\nTema: ${booking.topic}\n` : "",
        `1. Envíale una solicitud de pago de Payoneer por USD ${SESSION.priceUsd} a ${booking.userEmail}.`,
        `2. Cuando llegue el pago, márcala como pagada en ${SITE}/admin y pega tu enlace de Google Meet.`,
        "",
        `Si no se paga antes del ${drDate(booking.holdUntil)}, el horario se libera solo.`,
      ].join("\n"),
    ),
  ]);
  return booking;
}

export async function bookingsOfUser(userId: string): Promise<Booking[]> {
  await expireHolds();
  const rows = await db()`select * from public.bookings where user_id = ${userId} order by starts_at desc limit 50`;
  return rows.map(toBooking);
}

/** All bookings for the super admin; an advisor's own otherwise. Upcoming first, then the rest. */
export async function bookingsForAdmin(email: string | null): Promise<Booking[]> {
  await expireHolds();
  const rows = email
    ? await db()`select * from public.bookings where advisor = ${email}
                 order by (starts_at < now()), starts_at limit 200`
    : await db()`select * from public.bookings order by (starts_at < now()), starts_at limit 200`;
  return rows.map(toBooking);
}

export async function bookingById(id: string): Promise<Booking | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db()`select * from public.bookings where id = ${id}`;
  return row ? toBooking(row) : null;
}

const MEET = /^https:\/\/meet\.google\.com\/[a-z0-9-]+(\?.*)?$/i;

export async function confirmBooking(booking: Booking, meetUrl: string) {
  if (booking.status !== "pendiente_pago") throw new BookingError("Esta reserva ya no está pendiente de pago.");
  if (!MEET.test(meetUrl.trim())) throw new BookingError("Pega un enlace de Google Meet (https://meet.google.com/...).");
  await db()`update public.bookings set status = 'confirmada', paid_at = now(), meet_url = ${meetUrl.trim()}
             where id = ${booking.id} and status = 'pendiente_pago'`;
  const advisor = advisorByEmail(booking.advisor);
  await sendMail(
    booking.userEmail,
    `Confirmada: tu asesoría con ${advisor?.name ?? "ApliKo"}`,
    [
      `Recibimos tu pago. Tu asesoría con ${advisor?.name ?? "el equipo de ApliKo"} está confirmada:`,
      "",
      `${drDate(booking.startsAt)}, hora de República Dominicana (${SESSION.minutes} minutos).`,
      `Enlace de Google Meet: ${meetUrl.trim()}`,
      "",
      `Tus sesiones: ${SITE}/asesorias`,
    ].join("\n"),
  );
}

export async function cancelBooking(booking: Booking, by: "usuario" | "asesor") {
  if (booking.status === "cancelada") return;
  if (by === "usuario" && booking.status !== "pendiente_pago") {
    throw new BookingError("Una sesión ya pagada se cancela escribiéndole al asesor.");
  }
  await db()`update public.bookings set status = 'cancelada', cancelled_at = now() where id = ${booking.id}`;
  const advisor = advisorByEmail(booking.advisor);
  const when = drDate(booking.startsAt);
  if (by === "usuario" && advisor) {
    await sendMail(advisor.email, `Cancelada: asesoría del ${when}`, `${booking.userEmail} canceló la asesoría del ${when}. El horario quedó libre.`);
  } else {
    await sendMail(
      booking.userEmail,
      `Cancelada: tu asesoría del ${when}`,
      `${advisor?.name ?? "El asesor"} canceló la asesoría del ${when} (hora de RD). Puedes reservar otro horario en ${SITE}/asesorias.`,
    );
  }
}

/** Day-before reminders, run once a day by the Vercel cron (app/api/cron/recordatorios). */
export async function sendReminders(): Promise<number> {
  const sql = db();
  const rows = await sql`
    update public.bookings set reminder_sent_at = now()
    where status = 'confirmada' and reminder_sent_at is null
      and starts_at between now() + interval '12 hours' and now() + interval '36 hours'
    returning *`;
  for (const row of rows) {
    const b = toBooking(row);
    const advisor = advisorByEmail(b.advisor);
    const when = drDate(b.startsAt);
    await sendMail(
      [b.userEmail, ...(advisor ? [advisor.email] : [])],
      `Mañana: asesoría ApliKo, ${when}`,
      [
        `Recordatorio: la asesoría de ${b.userName ?? b.userEmail} con ${advisor?.name ?? "ApliKo"} es el ${when} (hora de RD).`,
        b.meetUrl ? `Enlace de Google Meet: ${b.meetUrl}` : "",
      ].join("\n"),
    );
  }
  return rows.length;
}

export { advisorBySlug };
