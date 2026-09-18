import { Resend } from "resend";
import { opportunities, todayRD } from "@/lib/opportunities";
import { getSql } from "@/lib/db";
import type { Opportunity } from "@/lib/types";

/**
 * Daily job (see vercel.json): emails each signed-in user about saved opportunities that
 * close in 7 days or tomorrow and are still "guardada" or "preparando".
 * Call with `Authorization: Bearer $CRON_SECRET`. Add `?dry=1` to preview without sending.
 */

export const dynamic = "force-dynamic";

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function emailHtml(siteUrl: string, groups: { title: string; items: Opportunity[] }[]) {
  const sections = groups
    .filter((g) => g.items.length)
    .map(
      (g) => `
      <h2 style="font-size:16px;margin:24px 0 8px">${g.title}</h2>
      <ul style="padding-left:18px;margin:0">
        ${g.items
          .map(
            (o) =>
              `<li style="margin:6px 0"><a href="${siteUrl}/becas/${o.slug}" style="color:#0b3b75">${escapeHtml(o.name)}</a>${
                o.sponsor ? ` <span style="color:#556175">· ${escapeHtml(o.sponsor)}</span>` : ""
              }</li>`,
          )
          .join("")}
      </ul>`,
    )
    .join("");
  return `<div style="font-family:system-ui,sans-serif;color:#0e1b2e;max-width:560px">
    <p style="font-size:20px;font-weight:600;margin:0">Apliko</p>
    ${sections}
    <p style="color:#556175;font-size:13px;margin-top:24px">Confirma la hora exacta en el sitio oficial: muchas cierran en la zona horaria del organizador. Si ya enviaste alguna, márcala como “Enviada” en <a href="${siteUrl}/mis-becas">Mis becas</a> y dejaremos de avisarte.</p>
  </div>`;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const sql = getSql();
  if (!sql) return Response.json({ error: "Falta DATABASE_URL" }, { status: 500 });
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  const resendKey = process.env.RESEND_API_KEY;
  if (!dry && !resendKey) return Response.json({ error: "Falta RESEND_API_KEY" }, { status: 500 });

  const today = todayRD();
  const windows = [
    { kind: "7d" as const, date: addDays(today, 7), title: "Cierran en 7 días" },
    { kind: "1d" as const, date: addDays(today, 1), title: "Cierran mañana" },
  ];
  const targets = new Map<string, { o: Opportunity; kind: "7d" | "1d" }>();
  for (const w of windows) {
    for (const o of opportunities) {
      if (o.deadline.kind === "exacta" && o.deadline.date === w.date) targets.set(o.id, { o, kind: w.kind });
    }
  }
  if (!targets.size) return Response.json({ today, sent: 0, note: "Ninguna beca cierra en 7 días ni mañana" });

  const ids = [...targets.keys()];
  // El email sale de la tabla que Neon Auth sincroniza, no de datos que mande el navegador.
  const rows = await sql`
    select t.user_id, t.opportunity_id, u.email
    from tracked_items t
    join neon_auth.users_sync u on u.id = t.user_id
    where t.opportunity_id = any(${ids})
      and t.stage in ('guardada', 'preparando')
      and u.email is not null
      and u.deleted_at is null
      and not exists (
        select 1 from reminder_log r
        where r.user_id = t.user_id
          and r.opportunity_id = t.opportunity_id
          and r.deadline >= ${today}::date
      )`;

  const byUser = new Map<string, { email: string; list: { opportunityId: string; kind: "7d" | "1d" }[] }>();
  for (const r of rows) {
    const userId = r.user_id as string;
    const t = targets.get(r.opportunity_id as string)!;
    const entry = byUser.get(userId) ?? { email: r.email as string, list: [] };
    entry.list.push({ opportunityId: r.opportunity_id as string, kind: t.kind });
    byUser.set(userId, entry);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const from = process.env.REMINDER_FROM ?? "Apliko <onboarding@resend.dev>";
  const resend = resendKey ? new Resend(resendKey) : null;
  const report: { user: string; items: number; status: string }[] = [];

  for (const [userId, { email, list }] of byUser) {
    const groups = windows.map((w) => ({
      title: w.title,
      items: list.filter((x) => x.kind === w.kind).map((x) => targets.get(x.opportunityId)!.o),
    }));
    const soonest = groups[1].items.length ? "mañana" : "en 7 días";
    const count = list.length;
    const subject = `${count === 1 ? "Una beca guardada cierra" : `${count} becas guardadas cierran`} ${soonest}`;

    if (dry || !resend) {
      report.push({ user: email, items: count, status: "dry-run" });
      continue;
    }
    const { error: sendError } = await resend.emails.send({ from, to: email, subject, html: emailHtml(siteUrl, groups) });
    if (sendError) {
      report.push({ user: email, items: count, status: `error: ${sendError.message}` });
      continue;
    }
    await sql.transaction(
      list.map(
        (x) => sql`
          insert into reminder_log (user_id, opportunity_id, kind, deadline)
          values (${userId}, ${x.opportunityId}, ${x.kind}, ${targets.get(x.opportunityId)!.o.deadline.date})
          on conflict do nothing`,
      ),
    );
    report.push({ user: email, items: count, status: "sent" });
  }

  return Response.json({ today, dry, candidates: targets.size, emails: report });
}
