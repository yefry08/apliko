import { getSql } from "@/lib/db";
import { isSuperadminEmail, sessionRole } from "@/lib/roles";

/**
 * Panel de admin. GET: estadísticas, cuentas y admins (admins y super admin). POST: nombrar o quitar un admin
 * por email (solo super admin); sirve aunque la persona todavía no tenga cuenta. Las sesiones anónimas que
 * crea Neon Auth no son cuentas y no se listan.
 */

export const dynamic = "force-dynamic";

/** A real account in neon_auth.users_sync: not deleted and not an anonymous session. */
const account = (t = "") =>
  `${t}deleted_at is null and coalesce((${t}raw_json->>'is_anonymous')::boolean, false) = false`;
const ACCOUNT = account();
const VERIFIED = (t = "") => `coalesce((${t}raw_json->>'primary_email_verified')::boolean, false)`;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request) {
  const session = await sessionRole(request);
  if (!session) return Response.json({ error: "Sin sesión" }, { status: 401 });
  if (session.role === "usuario") return Response.json({ error: "Solo para admins" }, { status: 403 });
  const sql = getSql();
  if (!sql) return Response.json({ error: "Falta DATABASE_URL" }, { status: 500 });

  const [stats, users, admins] = await Promise.all([
    sql.query(`
      select
        count(*) filter (where ${ACCOUNT}) as accounts,
        count(*) filter (where ${ACCOUNT} and ${VERIFIED()}) as verified,
        count(*) filter (where ${ACCOUNT} and created_at > now() - interval '7 days') as new_this_week,
        count(*) filter (where deleted_at is null and (raw_json->>'is_anonymous')::boolean) as anonymous,
        (select count(distinct user_id) from public.tracked_items) as with_saved,
        (select count(*) from public.expedientes) as with_profile
      from neon_auth.users_sync`),
    sql.query(`
      select u.id, u.email, u.name, u.created_at,
        ${VERIFIED("u.")} as verified,
        jsonb_path_query_array(u.raw_json, '$.oauth_providers[*].id') as providers,
        (u.raw_json->>'last_active_at_millis')::bigint as last_active,
        (select count(*) from public.tracked_items t where t.user_id = u.id) as saved,
        exists (select 1 from public.expedientes e where e.user_id = u.id) as has_profile,
        exists (select 1 from public.admin_emails a where a.email = lower(u.email)) as invited
      from neon_auth.users_sync u
      where ${account("u.")}
      order by u.created_at desc
      limit 500`),
    sql.query(`
      select a.email, a.granted_at,
        exists (select 1 from neon_auth.users_sync u
                where lower(u.email) = a.email and ${account("u.")} and ${VERIFIED("u.")}) as active
      from public.admin_emails a
      order by a.granted_at`),
  ]);

  const s = stats[0] ?? {};
  return Response.json({
    role: session.role,
    me: session.userId,
    stats: {
      accounts: Number(s.accounts ?? 0),
      verified: Number(s.verified ?? 0),
      newThisWeek: Number(s.new_this_week ?? 0),
      anonymous: Number(s.anonymous ?? 0),
      withSaved: Number(s.with_saved ?? 0),
      withProfile: Number(s.with_profile ?? 0),
    },
    users: users.map((u) => {
      const email = (u.email as string | null) ?? null;
      const verified = Boolean(u.verified);
      return {
        id: u.id as string,
        email,
        name: (u.name as string | null) ?? null,
        createdAt: new Date(u.created_at as string).toISOString(),
        verified,
        providers: (u.providers as string[] | null) ?? [],
        lastActive: u.last_active ? new Date(Number(u.last_active)).toISOString() : null,
        saved: Number(u.saved),
        hasProfile: Boolean(u.has_profile),
        // Same rule as lib/roles.ts: an email-based role needs the email verified.
        role: verified && isSuperadminEmail(email) ? "superadmin" : verified && u.invited ? "admin" : "usuario",
      };
    }),
    admins: admins.map((a) => ({
      email: a.email as string,
      since: new Date(a.granted_at as string).toISOString(),
      active: Boolean(a.active),
    })),
  });
}

export async function POST(request: Request) {
  const session = await sessionRole(request);
  if (!session) return Response.json({ error: "Sin sesión" }, { status: 401 });
  if (session.role !== "superadmin") return Response.json({ error: "Solo el super admin cambia roles" }, { status: 403 });
  const sql = getSql();
  if (!sql) return Response.json({ error: "Falta DATABASE_URL" }, { status: 500 });

  const body = (await request.json().catch(() => null)) as { email?: unknown; admin?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254 || typeof body?.admin !== "boolean") {
    return Response.json({ error: "Escribe un email válido" }, { status: 400 });
  }
  if (isSuperadminEmail(email)) return Response.json({ error: "Ese es el email del super admin" }, { status: 400 });

  if (body.admin) {
    await sql`insert into public.admin_emails (email, granted_by) values (${email}, ${session.userId})
              on conflict (email) do nothing`;
  } else {
    await sql`delete from public.admin_emails where email = ${email}`;
  }
  return Response.json({ ok: true });
}
