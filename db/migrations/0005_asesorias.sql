-- Asesorías 1-1 con el equipo (lib/asesorias.ts). Cada asesor se identifica por su email, igual que los roles.
-- Las horas de disponibilidad están en hora de Santo Domingo (UTC-4, sin horario de verano).

create table if not exists public.availability (
  id           bigserial primary key,
  advisor      text not null check (advisor = lower(advisor)),
  weekday      smallint not null check (weekday between 0 and 6),          -- 0 = domingo
  start_minute smallint not null check (start_minute between 0 and 1410),  -- minutos desde la medianoche
  end_minute   smallint not null check (end_minute between 30 and 1440 and end_minute > start_minute)
);
create index if not exists availability_advisor on public.availability (advisor);

create table if not exists public.bookings (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null,
  user_email       text not null,
  user_name        text,
  advisor          text not null,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  topic            text not null default '',
  price_usd        numeric(8, 2) not null,
  -- pendiente_pago: apartada hasta hold_until; confirmada: pagada y con enlace; cancelada.
  status           text not null default 'pendiente_pago' check (status in ('pendiente_pago', 'confirmada', 'cancelada')),
  hold_until       timestamptz not null,
  meet_url         text,
  paid_at          timestamptz,
  cancelled_at     timestamptz,
  reminder_sent_at timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists bookings_user on public.bookings (user_id);
create index if not exists bookings_advisor_start on public.bookings (advisor, starts_at);

-- Un asesor no puede tener dos sesiones vivas a la misma hora. Una pendiente vencida se cancela antes de
-- reservar encima (lib/asesorias.ts), así este índice basta.
create unique index if not exists bookings_no_double
  on public.bookings (advisor, starts_at) where status in ('pendiente_pago', 'confirmada');
