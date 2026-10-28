"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { SESSION } from "@/lib/equipo";

interface AdvisorCard {
  slug: string;
  name: string;
  role: string;
  photo?: string;
  initials: string;
}

interface MyBooking {
  id: string;
  advisorName: string;
  startsAt: string;
  topic: string;
  priceUsd: number;
  status: "pendiente_pago" | "confirmada" | "cancelada";
  holdUntil: string;
  meetUrl: string | null;
}

const TZ = "America/Santo_Domingo";
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("es-DO", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("es-DO", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const fullLabel = (iso: string) =>
  new Date(iso).toLocaleString("es-DO", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });

const STATUS: Record<MyBooking["status"], { label: string; className: string }> = {
  pendiente_pago: { label: "Pendiente de pago", className: "bg-amber/15 text-foreground" },
  confirmada: { label: "Confirmada", className: "bg-larimar/10 text-larimar" },
  cancelada: { label: "Cancelada", className: "bg-muted text-muted-foreground" },
};

export function Booker({ advisors, leadHours, windowDays }: { advisors: AdvisorCard[]; leadHours: number; windowDays: number }) {
  const { configured, user, loading, getToken } = useAuth();
  const [advisor, setAdvisor] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [booked, setBooked] = useState<{ when: string; holdUntil: string } | null>(null);
  const [mine, setMine] = useState<MyBooking[] | null>(null);

  const loadMine = useCallback(async () => {
    const token = await getToken();
    if (!token) return null;
    const res = await fetch("/api/asesorias/mias", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    return res?.ok ? ((await res.json()) as { bookings: MyBooking[] }).bookings : null;
    // getToken changes identity each render; the user id is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    loadMine().then((list) => {
      if (active && list) setMine(list);
    });
    return () => {
      active = false;
    };
  }, [user, loadMine]);

  const pick = (slug: string) => {
    setAdvisor(slug);
    setSlots(null);
    setDay(null);
    setSlot(null);
    setError("");
    setBooked(null);
    fetch(`/api/asesorias?asesor=${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? (res.json() as Promise<{ slots: string[] }>) : { slots: [] }))
      .then(({ slots }) => {
        setSlots(slots);
        setDay(slots[0] ? dayKey(slots[0]) : null);
      })
      .catch(() => setSlots([]));
  };

  const days = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of slots ?? []) map.set(dayKey(s), [...(map.get(dayKey(s)) ?? []), s]);
    return [...map.entries()];
  }, [slots]);

  const chosen = advisors.find((a) => a.slug === advisor);

  const book = async () => {
    if (!advisor || !slot) return;
    const token = await getToken();
    if (!token) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/asesorias", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ asesor: advisor, inicio: slot, tema: topic }),
    }).catch(() => null);
    const body = res ? ((await res.json().catch(() => ({}))) as { error?: string; booking?: { startsAt: string; holdUntil: string } }) : {};
    setBusy(false);
    if (!res?.ok || !body.booking) {
      setError(body.error ?? "No pudimos reservar. Intenta de nuevo.");
      return;
    }
    setBooked({ when: body.booking.startsAt, holdUntil: body.booking.holdUntil });
    setSlot(null);
    setTopic("");
    setSlots((s) => s?.filter((x) => x !== body.booking!.startsAt) ?? null);
    const list = await loadMine();
    if (list) setMine(list);
  };

  const cancel = async (id: string) => {
    const token = await getToken();
    if (!token) return;
    await fetch(`/api/asesorias/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    const list = await loadMine();
    if (list) setMine(list);
  };

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4" aria-labelledby="pick-title">
        <h2 id="pick-title" className="font-display text-3xl">
          1. Elige con quién
        </h2>
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4" role="list">
          {advisors.map((a) => (
            <li key={a.slug}>
              <button
                type="button"
                onClick={() => pick(a.slug)}
                aria-pressed={advisor === a.slug}
                className={`flex w-full flex-col items-start gap-3 rounded-2xl border p-3 text-left transition-colors hover:border-larimar ${
                  advisor === a.slug ? "border-larimar ring-2 ring-larimar/30" : ""
                }`}
              >
                <span className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-muted">
                  {a.photo ? (
                    <Image src={a.photo} alt="" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
                  ) : (
                    <span className="font-display text-4xl text-larimar">{a.initials}</span>
                  )}
                </span>
                <span>
                  <span className="block font-medium">{a.name}</span>
                  <span className="text-sm text-muted-foreground">{a.role}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {chosen && (
        <section className="flex flex-col gap-4" aria-labelledby="time-title">
          <h2 id="time-title" className="font-display text-3xl">
            2. Elige la hora
          </h2>
          <p className="text-sm text-muted-foreground">
            Hora de República Dominicana. Se reserva con al menos {leadHours} horas de anticipación, hasta {windowDays} días.
          </p>
          {slots === null ? (
            <p className="text-muted-foreground">Buscando horarios…</p>
          ) : days.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-5 text-muted-foreground">
              {chosen.name} no tiene horarios libres en los próximos {windowDays} días. Prueba con otra persona del equipo.
            </p>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Días">
                {days.map(([key, list]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={day === key}
                    onClick={() => {
                      setDay(key);
                      setSlot(null);
                    }}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm capitalize ${
                      day === key ? "border-larimar bg-larimar text-background" : "hover:border-larimar"
                    }`}
                  >
                    {dayLabel(list[0])}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {(days.find(([key]) => key === day)?.[1] ?? []).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={slot === s}
                    onClick={() => setSlot(s)}
                    className={`rounded-lg border px-4 py-2 text-sm tabular-nums ${
                      slot === s ? "border-larimar bg-larimar/10 text-larimar" : "hover:border-larimar"
                    }`}
                  >
                    {timeLabel(s)}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {chosen && slot && (
        <section className="flex max-w-xl flex-col gap-4 rounded-2xl border bg-card p-5" aria-labelledby="confirm-title">
          <h2 id="confirm-title" className="font-display text-3xl">
            3. Reserva
          </h2>
          <p>
            {SESSION.minutes} minutos con <span className="font-medium">{chosen.name}</span>,{" "}
            <span className="first-letter:uppercase">{fullLabel(slot)}</span> (hora de RD).{" "}
            <span className="font-medium">USD {SESSION.priceUsd}</span>.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">¿Sobre qué quieres hablar? (opcional)</span>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Por ejemplo: revisar mi ensayo para la beca Chevening"
              className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:border-larimar focus-visible:ring-2 focus-visible:ring-larimar/30"
            />
          </label>
          {!configured ? (
            <p className="text-sm text-muted-foreground">Las cuentas no están activadas en este sitio.</p>
          ) : loading ? null : !user ? (
            <p className="text-sm">
              <Link href="/registro" className="text-larimar hover:underline">
                Crea tu cuenta
              </Link>{" "}
              o{" "}
              <Link href="/entrar" className="text-larimar hover:underline">
                entra
              </Link>{" "}
              para reservar. Con Google es un clic.
            </p>
          ) : (
            <>
              {error && <p className="text-sm text-coral">{error}</p>}
              <button
                type="button"
                onClick={book}
                disabled={busy}
                className="h-11 self-start rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {busy ? "Reservando…" : `Reservar por USD ${SESSION.priceUsd}`}
              </button>
              <p className="text-xs text-muted-foreground">
                El pago se hace después, con la solicitud de Payoneer que llega a {user.email}.
              </p>
            </>
          )}
        </section>
      )}

      {booked && (
        <p className="max-w-xl rounded-2xl border border-larimar bg-larimar/5 p-5" aria-live="polite">
          Listo, apartaste el <span className="first-letter:uppercase">{fullLabel(booked.when)}</span>. Te llegará a tu
          correo una solicitud de pago de Payoneer por USD {SESSION.priceUsd}; págala antes del {fullLabel(booked.holdUntil)}{" "}
          para confirmar la sesión.
        </p>
      )}

      {user && mine && mine.length > 0 && (
        <section className="flex flex-col gap-4" aria-labelledby="mine-title">
          <h2 id="mine-title" className="font-display text-3xl">
            Tus sesiones
          </h2>
          <ul className="flex flex-col divide-y rounded-2xl border" role="list">
            {mine.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="font-medium first-letter:uppercase">{fullLabel(b.startsAt)}</span>
                  <span className="text-muted-foreground">
                    Con {b.advisorName}
                    {b.topic ? ` · ${b.topic}` : ""}
                  </span>
                  {b.status === "pendiente_pago" && (
                    <span className="text-muted-foreground">
                      Paga la solicitud de Payoneer (USD {b.priceUsd}) antes del {fullLabel(b.holdUntil)}.
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS[b.status].className}`}>{STATUS[b.status].label}</span>
                  {b.status === "confirmada" && b.meetUrl && (
                    <a href={b.meetUrl} target="_blank" rel="noopener noreferrer" className="text-larimar hover:underline">
                      Entrar a Meet ↗
                    </a>
                  )}
                  {b.status === "pendiente_pago" && (
                    <button type="button" onClick={() => cancel(b.id)} className="text-muted-foreground hover:text-coral">
                      Cancelar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
