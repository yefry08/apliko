import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  daysLeft,
  eligibilityFor,
  FUNDING_LABEL,
  statusOf,
  STATUS_LABEL,
  type Eligibility,
  type Profile,
  type Status,
} from "@/lib/logic";
import type { Opportunity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SaveButton } from "./save-button";
import { TiltCard } from "./tilt-card";

const STATUS_STYLE: Record<Status, string> = {
  "cierra-pronto": "bg-coral/15 text-coral",
  abierta: "bg-palm/15 text-palm",
  continua: "bg-larimar/15 text-larimar",
  "por-confirmar": "bg-amber/15 text-amber",
  cerrada: "bg-foreground/8 text-muted-foreground",
};

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px]", STATUS_STYLE[status], className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

const ELIG_STYLE: Record<Eligibility, string> = {
  elegible: "text-palm",
  revisar: "text-amber",
  "no-elegible": "text-coral",
};
export const ELIG_LABEL: Record<Eligibility, string> = {
  elegible: "Puedes postular",
  revisar: "Revisa requisitos",
  "no-elegible": "No elegible",
};

export function EligibilityTag({ value, className }: { value: Eligibility; className?: string }) {
  return <span className={cn("font-mono text-[11px]", ELIG_STYLE[value], className)}>{ELIG_LABEL[value]}</span>;
}

const dateFmt = new Intl.DateTimeFormat("es-DO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const SEASON_ES: Record<string, string> = {
  Fall: "Otoño",
  Winter: "Invierno",
  Spring: "Primavera",
  Summer: "Verano",
  Annual: "Anual",
  Rolling: "Continua",
};

export function deadlineText(o: Opportunity) {
  const d = o.deadline;
  if (d.kind === "exacta" && d.date) return dateFmt.format(new Date(d.date));
  if (d.kind === "temporada" && d.label) return `Suele cerrar en ${d.label.split(",").map((s) => SEASON_ES[s.trim()] ?? s.trim()).join(" / ").toLowerCase()} (EE.UU.)`;
  if (d.kind === "continua") return "Postulación continua";
  return d.label && !/unknown|varies/i.test(d.label) ? d.label : "Fecha por confirmar";
}

export function DaysLeft({ o }: { o: Opportunity }) {
  const d = daysLeft(o);
  if (d === null || d < 0) return null;
  return (
    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
      {d === 0 ? "cierra hoy" : d === 1 ? "queda 1 día" : `quedan ${d} días`}
    </span>
  );
}

export function OpportunityCard({ o, profile }: { o: Opportunity; profile?: Profile }) {
  const status = statusOf(o);
  return (
    <TiltCard className="group">
      <div className="relative flex h-full flex-col gap-4 rounded-2xl p-5 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-larimar">
        <div className="flex items-center justify-between gap-3">
          <StatusPill status={status} />
          <div className="flex items-center gap-1">
            <DaysLeft o={o} />
            <SaveButton id={o.id} name={o.name} className="-mr-2" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="font-display text-lg font-medium leading-snug tracking-tight">
            {/* Stretched link: the whole card is clickable, the save button sits above it. */}
            <Link href={`/becas/${o.slug}`} className="outline-none after:absolute after:inset-0 after:rounded-2xl">
              {o.name}
            </Link>
          </h3>
          {o.sponsor && <p className="line-clamp-1 text-sm text-muted-foreground">{o.sponsor}</p>}
        </div>
        <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="eyebrow">Cierre</dt>
            <dd className="tabular-nums">{deadlineText(o)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Destino</dt>
            <dd className="line-clamp-1">{o.destinations.join(", ")}</dd>
          </div>
          <div>
            <dt className="eyebrow">Fondos</dt>
            <dd>{FUNDING_LABEL[o.funding]}</dd>
          </div>
          <div>
            <dt className="eyebrow">Tipo</dt>
            <dd className="line-clamp-1">{o.types[0] ?? "—"}</dd>
          </div>
        </dl>
        <div className="flex items-center justify-between border-t pt-3">
          {profile ? <EligibilityTag value={eligibilityFor(o, profile)} /> : <span className="eyebrow">Ver detalles</span>}
          <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-larimar" aria-hidden="true" />
        </div>
      </div>
    </TiltCard>
  );
}
