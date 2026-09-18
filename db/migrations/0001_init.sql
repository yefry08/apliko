-- Apliko en Neon. Ya ejecutado en el proyecto "apliko" (us-east-1).
-- El user_id es el id de Neon Auth (texto, para casar con neon_auth.users_sync).
-- Estas tablas solo se tocan desde /api/sync y /api/recordatorios, que verifican
-- la sesión (o el secreto del cron) antes de consultar.

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

-- Para el job de recordatorios, que busca por beca y etapa.
create index if not exists tracked_items_opportunity_idx on public.tracked_items (opportunity_id, stage);

-- Evita repetir un aviso si el job corre dos veces.
create table if not exists public.reminder_log (
  user_id        text not null,
  opportunity_id text not null,
  kind           text not null check (kind in ('7d', '1d')),
  deadline       date not null,
  sent_at        timestamptz not null default now(),
  primary key (user_id, opportunity_id, kind, deadline)
);

-- El email de cada persona no se guarda aquí: lo mantiene Neon Auth en
-- neon_auth.users_sync, y de ahí lo lee el job de recordatorios.
