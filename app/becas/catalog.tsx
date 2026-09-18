"use client";

import Link from "next/link";
import { LayoutGrid, Rows3, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DaysLeft, deadlineText, EligibilityTag, OpportunityCard, StatusPill } from "@/components/opportunity-bits";
import {
  eligibilityFor,
  FUNDING_LABEL,
  LEVEL_LABEL,
  PROFILE_LABEL,
  statusOf,
  type Profile,
} from "@/lib/logic";
import type { Funding, Level, Opportunity } from "@/lib/types";
import { useApliko } from "@/lib/store";
import { cn } from "@/lib/utils";

export interface CatalogFilters {
  q: string;
  perfil: string;
  estado: string;
  nivel: string;
  fondos: string;
  destino: string;
  vista: "tarjetas" | "tabla";
}

const PAGE = 24;

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  placeholder: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 w-full min-w-0 rounded-lg border bg-card px-3 text-sm outline-none focus-visible:border-larimar focus-visible:ring-2 focus-visible:ring-larimar/30",
          !value && "text-muted-foreground",
        )}
      >
        <option value="">{placeholder}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Catalog({ items, initial }: { items: Opportunity[]; initial: CatalogFilters }) {
  const [f, setF] = useState(initial);
  const [limit, setLimit] = useState(PAGE);
  const { state, setProfile } = useApliko();
  const set = (patch: Partial<CatalogFilters>) => {
    setF((prev) => ({ ...prev, ...patch }));
    setLimit(PAGE);
    if (patch.perfil !== undefined) setProfile((patch.perfil || undefined) as Profile | undefined);
  };

  // Without a profile in the URL, start from the one remembered in this browser.
  const [appliedStored, setAppliedStored] = useState(Boolean(initial.perfil));
  if (!appliedStored && state.profile) {
    setAppliedStored(true);
    setF((prev) => ({ ...prev, perfil: state.profile! }));
  }

  // Keep the URL shareable without re-rendering the server page.
  useEffect(() => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) {
      if (!v || (k === "estado" && v === "vigentes") || (k === "vista" && v === "tarjetas")) continue;
      params.set(k, v);
    }
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [f]);

  const destinations = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((o) => o.destinations.forEach((d) => counts.set(d, (counts.get(d) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "es")).map(([d, n]) => [d, `${d} (${n})`] as [string, string]);
  }, [items]);

  const profile = (f.perfil || undefined) as Profile | undefined;

  const filtered = useMemo(() => {
    const q = normalize(f.q.trim());
    return items.filter((o) => {
      const status = statusOf(o);
      if (f.estado === "vigentes" && status === "cerrada") return false;
      if (f.estado && f.estado !== "vigentes" && f.estado !== "todas" && status !== f.estado) return false;
      if (f.nivel && !o.levels.includes(f.nivel as Level)) return false;
      if (f.fondos && o.funding !== f.fondos) return false;
      if (f.destino && !o.destinations.includes(f.destino)) return false;
      if (profile && eligibilityFor(o, profile) === "no-elegible") return false;
      if (q) {
        const hay = normalize([o.name, o.sponsor, o.audience, o.notes, ...o.areas, ...o.types, ...o.destinations].join(" "));
        if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    });
  }, [items, f, profile]);

  const hiddenForProfile = useMemo(
    () => (profile ? items.filter((o) => statusOf(o) !== "cerrada" && eligibilityFor(o, profile) === "no-elegible").length : 0),
    [items, profile],
  );

  const activeFilters = [f.q, f.perfil, f.nivel, f.fondos, f.destino].filter(Boolean).length + (f.estado !== "vigentes" ? 1 : 0);
  const shown = filtered.slice(0, limit);

  return (
    <div className="flex flex-col gap-6">
      {/* Profile — the primary filter */}
      <fieldset className="flex flex-col gap-2">
        <legend className="eyebrow mb-2">Mi situación</legend>
        <div className="flex flex-wrap gap-2">
          {(["", "rd", "latam", "eeuu-ciudadano", "eeuu-residente", "daca"] as const).map((p) => (
            <button
              key={p || "todas"}
              type="button"
              aria-pressed={f.perfil === p}
              onClick={() => set({ perfil: p })}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                f.perfil === p ? "border-larimar bg-larimar text-background" : "hover:border-foreground/40",
              )}
            >
              {p ? PROFILE_LABEL[p] : "Ver todas"}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border bg-card/50 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_repeat(4,1fr)]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="q" className="eyebrow">
            Buscar
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="q"
              type="search"
              value={f.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Fulbright, neurociencia, Alemania…"
              className="h-10 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-larimar focus-visible:ring-2 focus-visible:ring-larimar/30"
            />
          </div>
        </div>
        <FilterSelect
          id="estado"
          label="Estado"
          value={f.estado === "vigentes" ? "" : f.estado}
          onChange={(v) => set({ estado: v || "vigentes" })}
          placeholder="No cerradas"
          options={[
            ["cierra-pronto", "Cierra en 30 días"],
            ["abierta", "Abierta"],
            ["continua", "Continua"],
            ["por-confirmar", "Por confirmar"],
            ["cerrada", "Cerrada"],
            ["todas", "Todas"],
          ]}
        />
        <FilterSelect
          id="nivel"
          label="Nivel"
          value={f.nivel}
          onChange={(v) => set({ nivel: v })}
          placeholder="Todos los niveles"
          options={Object.entries(LEVEL_LABEL)}
        />
        <FilterSelect
          id="fondos"
          label="Financiamiento"
          value={f.fondos}
          onChange={(v) => set({ fondos: v })}
          placeholder="Cualquiera"
          options={(Object.entries(FUNDING_LABEL) as [Funding, string][]).filter(([k]) => k !== "varia")}
        />
        <FilterSelect id="destino" label="Destino" value={f.destino} onChange={(v) => set({ destino: v })} placeholder="Cualquier país" options={destinations} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          <span className="font-mono tabular-nums text-foreground">{filtered.length}</span> resultados
          {profile && hiddenForProfile > 0 && <> · ocultamos {hiddenForProfile} que no aplican a tu situación</>}
          {activeFilters > 0 && (
            <button
              type="button"
              onClick={() => set({ q: "", perfil: "", estado: "vigentes", nivel: "", fondos: "", destino: "" })}
              className="ml-3 inline-flex items-center gap-1 text-larimar hover:underline"
            >
              <X className="size-3.5" aria-hidden="true" /> Quitar filtros
            </button>
          )}
        </p>
        <div className="flex rounded-lg border p-0.5" role="group" aria-label="Vista">
          {(
            [
              ["tarjetas", LayoutGrid, "Tarjetas"],
              ["tabla", Rows3, "Tabla"],
            ] as const
          ).map(([v, Icon, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={f.vista === v}
              onClick={() => setF((prev) => ({ ...prev, vista: v }))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm",
                f.vista === v ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed p-10">
          <p className="font-display text-xl">No hay oportunidades con estos filtros.</p>
          <p className="text-sm text-muted-foreground">
            Prueba con “Estado: Todas” para ver las que cerraron este año; muchas abren de nuevo en el siguiente ciclo.
          </p>
        </div>
      ) : f.vista === "tarjetas" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((o) => (
            <OpportunityCard key={o.id} o={o} profile={profile} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-card text-left">
              <tr>
                {["Oportunidad", "Estado", "Cierre", "Destino", "Fondos", profile ? "Para ti" : "Tipo"].map((h) => (
                  <th key={h} scope="col" className="eyebrow px-4 py-3 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.id} className="border-t align-top hover:bg-card/60">
                  <td className="max-w-[320px] px-4 py-3">
                    <Link href={`/becas/${o.slug}`} className="font-medium hover:text-larimar">
                      {o.name}
                    </Link>
                    {o.sponsor && <p className="line-clamp-1 text-xs text-muted-foreground">{o.sponsor}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={statusOf(o)} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    <div>{deadlineText(o)}</div>
                    <DaysLeft o={o} />
                  </td>
                  <td className="px-4 py-3">{o.destinations.join(", ")}</td>
                  <td className="px-4 py-3">{FUNDING_LABEL[o.funding]}</td>
                  <td className="px-4 py-3">{profile ? <EligibilityTag value={eligibilityFor(o, profile)} /> : o.types[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE)}
          className="self-center rounded-full border px-5 py-2 text-sm hover:border-larimar hover:text-larimar"
        >
          Mostrar {Math.min(PAGE, filtered.length - limit)} más de {filtered.length - limit}
        </button>
      )}
    </div>
  );
}
