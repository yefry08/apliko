-- Admins invitados por email: la cuenta que entre con ese email, ya verificado, es admin (lib/roles.ts).
-- Sirve para nombrar admins que todavía no tienen cuenta. Solo el super admin agrega o quita filas, desde /api/admin.

create table if not exists public.admin_emails (
  email      text primary key check (email = lower(email)),
  granted_by text not null,
  granted_at timestamptz not null default now()
);

-- Equipo de ApliKo: María J. Colas (COO), Yira Tavarez Espinal (CFO) y Marco Reyes (CTO).
insert into public.admin_emails (email, granted_by) values
  ('majocolas17@gmail.com', 'superadmin'),
  ('tavarezyira@gmail.com', 'superadmin'),
  ('marcoreyes2050@gmail.com', 'superadmin')
on conflict (email) do nothing;
