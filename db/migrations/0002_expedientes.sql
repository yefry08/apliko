-- Mi perfil: el perfil maestro para postular (lib/expediente.ts), un documento JSON por usuario.
-- Solo se toca desde /api/sync, que valida y limpia el JSON antes de guardarlo.

create table if not exists public.expedientes (
  user_id    text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
