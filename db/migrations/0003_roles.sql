-- Admins de ApliKo. El super admin no vive aquí: es la cuenta cuyo email verificado coincide con
-- SUPERADMIN_EMAIL (lib/roles.ts), así nadie puede quitárselo ni dárselo desde la base.
-- Solo el super admin agrega o quita filas, desde /api/admin.

create table if not exists public.user_roles (
  user_id    text primary key,
  role       text not null check (role in ('admin')),
  granted_by text not null,
  granted_at timestamptz not null default now()
);
