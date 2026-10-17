import { getSessionUserId } from "@/lib/auth";
import { getSql } from "@/lib/db";

/** "usuario" is everyone signed in; "admin" sees /admin; "superadmin" also names and removes admins. */
export type Role = "usuario" | "admin" | "superadmin";

const superadminEmail = () => process.env.SUPERADMIN_EMAIL?.trim().toLowerCase() || null;

/**
 * Neon Auth copies each account to neon_auth.users_sync. The super admin is the account whose email
 * matches SUPERADMIN_EMAIL and is verified: an unverified match could be anyone who typed that email.
 */
export async function roleOf(userId: string): Promise<Role> {
  const sql = getSql();
  if (!sql) return "usuario";
  const email = superadminEmail();
  const [account, granted] = await Promise.all([
    email
      ? sql`select 1 from neon_auth.users_sync
            where id = ${userId} and deleted_at is null and lower(email) = ${email}
              and (raw_json->>'primary_email_verified')::boolean`
      : Promise.resolve([]),
    sql`select role from public.user_roles where user_id = ${userId}`,
  ]);
  if (account.length > 0) return "superadmin";
  return granted[0]?.role === "admin" ? "admin" : "usuario";
}

/** The signed-in user's id and role, or null without a valid session. */
export async function sessionRole(request: Request): Promise<{ userId: string; role: Role } | null> {
  const userId = await getSessionUserId(request);
  if (!userId) return null;
  return { userId, role: await roleOf(userId) };
}
