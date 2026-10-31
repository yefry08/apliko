"use client";

import { useCallback, useEffect, useState } from "react";
import { SESSION } from "@/lib/equipo";

interface Range {
  weekday: number;
  start: number;
  end: number;
}

interface AdminBooking {
  id: string;
  advisorName: string;
  userEmail: string;
  userName: string | null;
  startsAt: string;
  topic: string;
  priceUsd: number;
  status: "pendiente_pago" | "confirmada" | "cancelada";
  holdUntil: string;
  meetUrl: string | null;
}

interface Data {
  isAdvisor: boolean;
  mailConfigured: boolean;
  availability: Range[];
  bookings: AdminBooking[];
  /** When this data arrived; "upcoming" is relative to it, so render stays pure. */
  loadedAt: number;
}

// Monday first, as people read a week; values are JS weekdays (0 = Sunday).
const WEEK = [
  [1, "Lunes"],
  [2, "Martes"],
  [3, "Miércoles"],
  [4, "Jueves"],
  [5, "Viernes"],
  [6, "Sábado"],
  [0, "Domingo"],
] as const;
const TIMES = Array.from({ length: 49 }, (_, i) => i * 30);
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString("es-DO", {
    timeZone: "America/Santo_Domingo",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
const STATUS_LABEL = { pendiente_pago: "Pendiente de pago", confirmada: "Confirmada", cancelada: "Cancelada" } as const;
const selectClass = "h-9 rounded-lg border bg-card px-2 text-sm tabular-nums";

export function AdminAsesorias({ getToken, superadmin }: { getToken: () => Promise<string | null>; superadmin: boolean }) {
  const [data, setData] = useState<Data | null>(null);
  const [ranges, setRanges] = useState<Range[]>([]);
  const [meet, setMeet] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const call = useCallback(
    async (method: "GET" | "PUT" | "POST", body?: unknown) => {
      const token = await getToken();
      if (!token) return null;
      const res = await fetch("/api/admin/asesorias", {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      }).catch(() => null);
      const json = res ? ((await res.json().catch(() => ({}))) as Data & { error?: string }) : null;
      return { ok: Boolean(res?.ok), json };
    },
    [getToken],
  );

  const refresh = useCallback(async () => {
    const r = await call("GET");
    if (r?.ok && r.json) {
      setData({ ...r.json, loadedAt: Date.now() });
      setRanges(r.json.availability);
    }
  }, [call]);

  useEffect(() => {
    let active = true;
    call("GET").then((r) => {
      if (!active) return;
      if (r?.ok && r.json) {
        setData({ ...r.json, loadedAt: Date.now() });
        setRanges(r.json.availability);
      } else {
        setFailed(true);
      }
    });
    return () => {
      active = false;
    };
    // Load once per mount; `call` changes with getToken's identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) {
    return failed ? (
      <p className="text-coral">No pudimos cargar las asesorías. Recarga la página.</p>
    ) : (
      <p className="text-muted-foreground">Cargando asesorías…</p>
    );
  }

  const act = async (body: unknown, done: string) => {
    setBusy(true);
    setNotice("");
    const r = await call("POST", body);
    setBusy(false);
    setNotice(r?.ok ? done : (r?.json?.error ?? "No se pudo completar."));
    if (r?.ok) await refresh();
  };

  const saveRanges = async () => {
    setBusy(true);
    setNotice("");
    const r = await call("PUT", { ranges });
    setBusy(false);
    setNotice(r?.ok ? "Disponibilidad guardada." : (r?.json?.error ?? "No se pudo guardar."));
  };

  const update = (i: number, patch: Partial<Range>) => setRanges((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const upcoming = data.bookings.filter(
    (b) => b.status !== "cancelada" && new Date(b.startsAt).getTime() > data.loadedAt - 60 * 60_000,
  );
  const past = data.bookings.filter((b) => !upcoming.includes(b));

  return (
    <section className="flex scroll-mt-24 flex-col gap-6" id="asesorias" aria-labelledby="asesorias-title">
      <div className="flex flex-col gap-2">
        <h2 id="asesorias-title" className="font-display text-3xl">
          Asesorías
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {SESSION.minutes} minutos por USD {SESSION.priceUsd}. Cuando alguien reserva, envíale una solicitud de pago desde
          Payoneer (Recibir pagos &gt; Solicitar un pago) a su email. Cuando llegue el pago, pega tu enlace de Google Meet y
          márcala pagada: la sesión se confirma y le llega el enlace.
        </p>
        {!data.mailConfigured && (
          <p className="max-w-2xl text-sm text-coral">
            Los correos están apagados: falta GMAIL_USER y GMAIL_APP_PASSWORD en Vercel. Las reservas funcionan, pero nadie
            recibe avisos.
          </p>
        )}
      </div>

      {notice && (
        <p className="text-sm" aria-live="polite">
          {notice}
        </p>
      )}

      {data.isAdvisor ? (
        <div className="flex flex-col gap-3 rounded-2xl border p-5">
          <h3 className="font-medium">Tu disponibilidad semanal (hora de RD)</h3>
          {ranges.length === 0 && <p className="text-sm text-muted-foreground">Sin horarios: nadie puede reservar contigo todavía.</p>}
          <ul className="flex flex-col gap-2" role="list">
            {ranges.map((r, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                <select aria-label="Día" value={r.weekday} onChange={(e) => update(i, { weekday: Number(e.target.value) })} className={selectClass}>
                  {WEEK.map(([d, label]) => (
                    <option key={d} value={d}>
                      {label}
                    </option>
                  ))}
                </select>
                <select aria-label="Desde" value={r.start} onChange={(e) => update(i, { start: Number(e.target.value) })} className={selectClass}>
                  {TIMES.slice(0, -1).map((m) => (
                    <option key={m} value={m}>
                      {hhmm(m)}
                    </option>
                  ))}
                </select>
                <span>a</span>
                <select aria-label="Hasta" value={r.end} onChange={(e) => update(i, { end: Number(e.target.value) })} className={selectClass}>
                  {TIMES.slice(1).map((m) => (
                    <option key={m} value={m}>
                      {m === 1440 ? "24:00" : hhmm(m)}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => setRanges((rs) => rs.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-coral">
                  Quitar
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setRanges((rs) => [...rs, { weekday: 1, start: 18 * 60, end: 20 * 60 }])}
              className="rounded-full border px-4 py-2 text-sm hover:border-larimar hover:text-larimar"
            >
              Añadir horario
            </button>
            <button
              type="button"
              onClick={saveRanges}
              disabled={busy}
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              Guardar disponibilidad
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Tu cuenta no está en la lista de asesores del equipo, así que no recibe reservas.</p>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="font-medium">{superadmin ? "Todas las reservas" : "Tus reservas"}</h3>
        {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No hay sesiones próximas.</p>}
        <ul className="flex flex-col divide-y rounded-2xl border empty:hidden" role="list">
          {upcoming.map((b) => (
            <li key={b.id} className="flex flex-col gap-3 p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium capitalize">{when(b.startsAt)}</p>
                  <p className="text-muted-foreground">
                    {b.userName ? `${b.userName} · ` : ""}
                    {b.userEmail}
                    {superadmin ? ` · con ${b.advisorName}` : ""}
                  </p>
                  {b.topic && <p className="mt-1">{b.topic}</p>}
                </div>
                <span className={b.status === "confirmada" ? "font-medium text-larimar" : "text-muted-foreground"}>
                  {STATUS_LABEL[b.status]}
                </span>
              </div>
              {b.status === "pendiente_pago" && (
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground">
                    Envía la solicitud de Payoneer por USD {b.priceUsd} a <span className="font-medium text-foreground">{b.userEmail}</span>. Se
                    libera sola el <span className="capitalize">{when(b.holdUntil)}</span> si no se paga.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="url"
                      value={meet[b.id] ?? ""}
                      onChange={(e) => setMeet((m) => ({ ...m, [b.id]: e.target.value }))}
                      placeholder="https://meet.google.com/abc-defg-hij"
                      aria-label="Enlace de Google Meet"
                      className="h-9 w-72 max-w-full rounded-lg border bg-card px-3 text-sm"
                    />
                    <button
                      type="button"
                      disabled={busy || !meet[b.id]}
                      onClick={() => act({ id: b.id, accion: "confirmar", meet: meet[b.id] }, "Sesión confirmada; le enviamos el enlace.")}
                      className="h-9 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    >
                      Pagada: confirmar
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act({ id: b.id, accion: "cancelar" }, "Reserva cancelada.")}
                      className="h-9 rounded-full border px-4 text-sm hover:border-coral hover:text-coral"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {b.status === "confirmada" && (
                <div className="flex flex-wrap items-center gap-3">
                  {b.meetUrl && (
                    <a href={b.meetUrl} target="_blank" rel="noopener noreferrer" className="text-larimar hover:underline">
                      {b.meetUrl}
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act({ id: b.id, accion: "cancelar" }, "Sesión cancelada; le avisamos. Si ya pagó, devuélvele el pago en Payoneer.")}
                    className="text-muted-foreground hover:text-coral"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {past.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">Pasadas y canceladas ({past.length})</summary>
            <ul className="mt-2 flex flex-col gap-1" role="list">
              {past.map((b) => (
                <li key={b.id} className="text-muted-foreground">
                  <span className="capitalize">{when(b.startsAt)}</span> · {b.userEmail} · {STATUS_LABEL[b.status]}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}
