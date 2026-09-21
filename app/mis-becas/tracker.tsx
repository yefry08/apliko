"use client";

import Link from "next/link";
import { CalendarPlus, Trash2 } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { DaysLeft, deadlineText, EligibilityTag, StatusPill } from "@/components/opportunity-bits";
import { buildIcs } from "@/lib/ics";
import { eligibilityFor, PROFILE_LABEL, statusOf, type Profile } from "@/lib/logic";
import { STAGES, useApliko, type Stage } from "@/lib/store";
import type { Opportunity } from "@/lib/types";
import { cn } from "@/lib/utils";

const PROFILES = Object.keys(PROFILE_LABEL) as Profile[];

// Server render and the first client render both show "not hydrated", avoiding a flash of the empty state.
const useHydrated = () => useSyncExternalStore(() => () => {}, () => true, () => false);

function downloadIcs(items: Opportunity[]) {
  const blob = new Blob([buildIcs(items, window.location.origin)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "apliko-mis-becas.ics";
  a.click();
  URL.revokeObjectURL(url);
}

export function Tracker({ items }: { items: Opportunity[] }) {
  const hydrated = useHydrated();
  const { state, setStage, setNotes, toggleSaved, setProfile } = useApliko();
  const byId = useMemo(() => new Map(items.map((o) => [o.id, o])), [items]);

  const saved = Object.entries(state.items)
    .map(([id, t]) => ({ o: byId.get(id), t }))
    .filter((x): x is { o: Opportunity; t: (typeof state.items)[string] } => Boolean(x.o))
    .sort((a, b) => (a.o.deadline.date ?? "9999").localeCompare(b.o.deadline.date ?? "9999"));

  const upcoming = saved.filter(({ o, t }) => t.stage !== "enviada" && t.stage !== "resultado" && ["abierta", "cierra-pronto"].includes(statusOf(o)));
  const withDates = saved.filter(({ o }) => o.deadline.kind === "exacta" && statusOf(o) !== "cerrada").map(({ o }) => o);

  if (!hydrated) return <div className="h-64 animate-pulse rounded-2xl border bg-card/40" aria-hidden="true" />;

  if (saved.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed p-10">
        <p className="font-display text-2xl">Todavía no guardas ninguna beca.</p>
        <p className="max-w-xl text-muted-foreground">
          Toca el marcador en cualquier tarjeta o ficha para traerla aquí. Luego podrás moverla de “Guardadas” a “Enviadas” y
          añadir sus fechas a tu calendario.
        </p>
        <Link href="/becas" className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
          Explorar becas
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Summary + actions */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card/50 p-5 md:flex-row md:items-end md:justify-between">
        <dl className="flex flex-wrap gap-x-10 gap-y-3">
          {STAGES.map((s) => (
            <div key={s.id} className="flex flex-col">
              <dt className="eyebrow">{s.label}</dt>
              <dd className="font-display text-3xl tabular-nums">{saved.filter(({ t }) => t.stage === s.id).length}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-3 md:items-end">
          <label className="flex flex-col gap-1.5 text-sm md:items-end">
            <span className="eyebrow">Mi situación</span>
            <select
              id="perfil-tracker"
              value={state.profile ?? ""}
              onChange={(e) => setProfile((e.target.value || undefined) as Profile | undefined)}
              className="h-10 rounded-lg border bg-card px-3 text-sm"
            >
              <option value="">Sin elegir</option>
              {PROFILES.map((p) => (
                <option key={p} value={p}>
                  {PROFILE_LABEL[p]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={withDates.length === 0}
            onClick={() => downloadIcs(withDates)}
            className="inline-flex items-center gap-2 self-start rounded-full border px-4 py-2 text-sm hover:border-larimar hover:text-larimar disabled:opacity-50 md:self-end"
          >
            <CalendarPlus className="size-4" aria-hidden="true" />
            Añadir {withDates.length} {withDates.length === 1 ? "fecha" : "fechas"} al calendario
          </button>
        </div>
      </div>

      {upcoming.length > 0 && (
        <p className="rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral">
          Sin enviar y con fecha próxima: {upcoming.map(({ o }) => o.name).slice(0, 3).join(", ")}
          {upcoming.length > 3 ? ` y ${upcoming.length - 3} más` : ""}.
        </p>
      )}

      {/* Board */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STAGES.map((stage) => {
          const column = saved.filter(({ t }) => t.stage === stage.id);
          return (
            <section key={stage.id} aria-labelledby={`col-${stage.id}`} className="flex flex-col gap-3 rounded-2xl border bg-card/30 p-3">
              <header className="flex items-baseline justify-between px-1">
                <h2 id={`col-${stage.id}`} className="font-display text-lg">
                  {stage.label}
                </h2>
                <span className="text-xs text-muted-foreground">{stage.hint}</span>
              </header>
              {column.length === 0 && <p className="px-1 py-6 text-center text-sm text-muted-foreground">Nada aquí todavía</p>}
              {column.map(({ o, t }) => (
                <article key={o.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <StatusPill status={statusOf(o)} />
                    <DaysLeft o={o} />
                  </div>
                  <Link href={`/becas/${o.slug}`} className="font-medium leading-snug hover:text-larimar">
                    {o.name}
                  </Link>
                  <p className="text-xs tabular-nums text-muted-foreground">Cierre: {deadlineText(o)}</p>
                  {state.profile && <EligibilityTag value={eligibilityFor(o, state.profile)} />}
                  <label className="flex flex-col gap-1">
                    <span className="sr-only">Etapa de {o.name}</span>
                    <select
                      id={`stage-${o.id}`}
                      value={t.stage}
                      onChange={(e) => setStage(o.id, e.target.value as Stage)}
                      className={cn("h-9 rounded-lg border bg-background px-2 text-sm")}
                    >
                      {STAGES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="eyebrow">Notas</span>
                    <textarea
                      id={`notes-${o.id}`}
                      value={t.notes}
                      onChange={(e) => setNotes(o.id, e.target.value)}
                      rows={2}
                      placeholder="Carta del profesor, TOEFL, apostillar título…"
                      className="resize-y rounded-lg border bg-background px-2 py-1.5 text-sm placeholder:text-muted-foreground"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleSaved(o.id)}
                    className="inline-flex items-center gap-1.5 self-start text-xs text-muted-foreground hover:text-coral"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" /> Quitar
                  </button>
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
