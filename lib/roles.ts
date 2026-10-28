import { getSessionUserId } from "@/lib/auth";
import { getSql } from "@/lib/db";

/** "usuario" is everyone signed in; "admin" sees /admin; "superadmin" also names and removes admins. */
export type Role = "usuario" | "admin" | "superadmin";

const superadminEmail = () => process.env.SUPERADMIN_EMAIL?.trim().toLowerCase() || null;

/**
 * Roles go by email: SUPERADMIN_EMAIL for the super admin, public.admin_emails for admins (so someone can be
 * named before they have an account). Neon Auth copies each account to neon_auth.users_sync, and the email
 * only counts once it is verified: unverified, it could be anyone who typed it.
 */
export async function roleOf(userId: string): Promise<Role> {
  const sql = getSql();
  if (!sql) return "usuario";
  const [account] = await sql`
    select lower(u.email) as email,
      exists (select 1 from public.admin_emails a where a.email = lower(u.email)) as admin
    from neon_auth.users_sync u
    where u.id = ${userId} and u.deleted_at is null
      and coalesce((u.raw_json->>'primary_email_verified')::boolean, false)`;
  if (!account?.email) return "usuario";
  if (account.email === superadminEmail()) return "superadmin";
  return account.admin ? "admin" : "usuario";
}

export const isSuperadminEmail = (email: string | null | undefined) =>
  Boolean(email) && email!.trim().toLowerCase() === superadminEmail();

/** The signed-in user's id and role, or null without a valid session. */
export async function sessionRole(request: Request): Promise<{ userId: string; role: Role } | null> {
  const userId = await getSessionUserId(request);
  if (!userId) return null;
  return { userId, role: await roleOf(userId) };
}

/** Email (lowercase) and name of an account, and whether the email is verified. Null if there is no account. */
export async function accountOf(userId: string): Promise<{ email: string | null; name: string | null; verified: boolean } | null> {
  const sql = getSql();
  if (!sql) return null;
  const [row] = await sql`
    select lower(email) as email, name, coalesce((raw_json->>'primary_email_verified')::boolean, false) as verified
    from neon_auth.users_sync where id = ${userId} and deleted_at is null`;
  return row ? { email: row.email ?? null, name: row.name ?? null, verified: Boolean(row.verified) } : null;
}
