-- Apliko en Neon. Ya ejecutado en el proyecto "apliko" (us-east-1).
-- El user_id es el id de Neon Auth (texto, para casar con neon_auth.users_sync).
-- Estas tablas solo se tocan desde /api/sync, que verifica la sesión antes de consultar.

create table if not exists public.profiles (
  user_id    text primary key,
  situation  text check (situation in ('rd', 'latam', 'eeuu-ciudadano', 'eeuu-residente', 'daca')),
  updated_at timestamptz not null default now()
);

create table if not exists public.tracked_items (
  user_id        text not null,
  opportunity_id text not null,
  stage          text not null default 'guardada'
                 check (stage in ('guardada', 'preparando', 'enviada', 'resultado')),
  notes          text not null default '',
  saved_at       timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);
