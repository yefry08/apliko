import { getSql } from "@/lib/db";
import { roleOf, sessionRole } from "@/lib/roles";

/**
 * Panel de admin. GET: estadísticas y cuentas (admins y super admin). POST: nombrar o quitar admins
 * (solo super admin). Las sesiones anónimas que crea Neon Auth no son cuentas y no se listan.
 */

export const dynamic = "force-dynamic";

/** A real account in neon_auth.users_sync: not deleted and not an anonymous session. */
const account = (t = "") =>
  `${t}deleted_at is null and coalesce((${t}raw_json->>'is_anonymous')::boolean, false) = false`;
const ACCOUNT = account();

export async function GET(request: Request) {
  const session = await sessionRole(request);
  if (!session) return Response.json({ error: "Sin sesión" }, { status: 401 });
  if (session.role === "usuario") return Response.json({ error: "Solo para admins" }, { status: 403 });
  const sql = getSql();
  if (!sql) return Response.json({ error: "Falta DATABASE_URL" }, { status: 500 });

  const [stats, users] = await Promise.all([
    sql.query(`
      select
        count(*) filter (where ${ACCOUNT}) as accounts,
        count(*) filter (where ${ACCOUNT} and (raw_json->>'primary_email_verified')::boolean) as verified,
        count(*) filter (where ${ACCOUNT} and created_at > now() - interval '7 days') as new_this_week,
        count(*) filter (where deleted_at is null and (raw_json->>'is_anonymous')::boolean) as anonymous,
        (select count(distinct user_id) from public.tracked_items) as with_saved,
        (select count(*) from public.expedientes) as with_profile
      from neon_auth.users_sync`),
    sql.query(`
      select u.id, u.email, u.name, u.created_at,
        coalesce((u.raw_json->>'primary_email_verified')::boolean, false) as verified,
        jsonb_path_query_array(u.raw_json, '$.oauth_providers[*].id') as providers,
        (u.raw_json->>'last_active_at_millis')::bigint as last_active,
        (select count(*) from public.tracked_items t where t.user_id = u.id) as saved,
        exists (select 1 from public.expedientes e where e.user_id = u.id) as has_profile,
        r.role
      from neon_auth.users_sync u
      left join public.user_roles r on r.user_id = u.id
      where ${account("u.")}
      order by u.created_at desc
      limit 500`),
  ]);

  const superEmail = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
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
    users: users.map((u) => ({
      id: u.id as string,
      email: (u.email as string | null) ?? null,
      name: (u.name as string | null) ?? null,
      createdAt: new Date(u.created_at as string).toISOString(),
      verified: Boolean(u.verified),
      providers: (u.providers as string[] | null) ?? [],
      lastActive: u.last_active ? new Date(Number(u.last_active)).toISOString() : null,
      saved: Number(u.saved),
      hasProfile: Boolean(u.has_profile),
      role:
        superEmail && u.verified && (u.email as string | null)?.toLowerCase() === superEmail
          ? "superadmin"
          : u.role === "admin"
            ? "admin"
            : "usuario",
    })),
  });
}

export async function POST(request: Request) {
  const session = await sessionRole(request);
  if (!session) return Response.json({ error: "Sin sesión" }, { status: 401 });
  if (session.role !== "superadmin") return Response.json({ error: "Solo el super admin cambia roles" }, { status: 403 });
  const sql = getSql();
  if (!sql) return Response.json({ error: "Falta DATABASE_URL" }, { status: 500 });

  const body = (await request.json().catch(() => null)) as { userId?: unknown; admin?: unknown } | null;
  const userId = typeof body?.userId === "string" ? body.userId : "";
  if (!userId || typeof body?.admin !== "boolean") return Response.json({ error: "Datos inválidos" }, { status: 400 });
  if (userId === session.userId) return Response.json({ error: "No puedes cambiar tu propio rol" }, { status: 400 });

  // Only real accounts with a verified email can be admins.
  const target = await sql.query(
    `select 1 from neon_auth.users_sync
     where id = $1 and ${ACCOUNT} and (raw_json->>'primary_email_verified')::boolean`,
    [userId],
  );
  if (target.length === 0) return Response.json({ error: "La cuenta no existe o no verificó su email" }, { status: 400 });
  if ((await roleOf(userId)) === "superadmin") return Response.json({ error: "No se cambia el rol del super admin" }, { status: 400 });

  if (body.admin) {
    await sql`insert into public.user_roles (user_id, role, granted_by) values (${userId}, 'admin', ${session.userId})
              on conflict (user_id) do update set role = 'admin', granted_by = excluded.granted_by, granted_at = now()`;
  } else {
    await sql`delete from public.user_roles where user_id = ${userId}`;
  }
  return Response.json({ ok: true });
}
