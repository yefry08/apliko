import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarPlus } from "lucide-react";
import { SaveButton } from "@/components/save-button";
import { DaysLeft, deadlineText, EligibilityTag, OpportunityCard, StatusPill } from "@/components/opportunity-bits";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import {
  ELIGIBILITY_REASON,
  eligibilityFor,
  FUNDING_LABEL,
  getBySlug,
  LEVEL_LABEL,
  opportunities,
  PROFILE_LABEL,
  sortForDisplay,
  statusOf,
  type Profile,
} from "@/lib/opportunities";

export const revalidate = 3600;

export function generateStaticParams() {
  return opportunities.map((o) => ({ slug: o.slug }));
}

export async function generateMetadata(props: PageProps<"/becas/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const o = getBySlug(slug);
  if (!o) return {};
  return {
    title: o.name,
    description: `${o.name}${o.sponsor ? ` (${o.sponsor})` : ""}. Destino: ${o.destinations.join(", ")}. Cierre: ${deadlineText(o)}.`,
  };
}

const dateFmt = new Intl.DateTimeFormat("es-DO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const isKnown = (v?: string) => !!v && !/^(unknown|varies|varía|—)$/i.test(v.trim());

export default async function OpportunityPage(props: PageProps<"/becas/[slug]">) {
  const { slug } = await props.params;
  const o = getBySlug(slug);
  if (!o) notFound();

  const status = statusOf(o);
  const facts: [string, string | undefined][] = [
    ["Cierre", deadlineText(o)],
    ["Destino", o.destinations.join(", ")],
    ["Monto", o.amount],
    ["Financiamiento", o.amount ? undefined : FUNDING_LABEL[o.funding]],
    ["Quién puede postular", o.source === "financiamiento" ? o.citizenshipRaw : undefined],
    ["Nivel", o.levels.map((l) => LEVEL_LABEL[l]).join(", ") || undefined],
    ["Tipo", o.types.join(", ")],
    ["Área", o.areas.join(", ") || undefined],
    ["Duración", o.duration],
    ["Idioma", o.language],
    ["Promedio (GPA)", o.gpa],
    ["Cartas de recomendación", o.recommendations],
    ["Ensayos", o.essays],
    ["Competitividad", o.difficulty],
  ];

  const related = sortForDisplay(
    opportunities.filter(
      (x) => x.id !== o.id && statusOf(x) !== "cerrada" && x.destinations.some((d) => o.destinations.includes(d)),
    ),
  ).slice(0, 3);

  const profiles = Object.keys(PROFILE_LABEL) as Profile[];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-10 sm:px-6">
        <Link href="/becas" className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" /> Volver al catálogo
        </Link>

        <header className="flex flex-col gap-5 border-b pb-10">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={status} />
            <DaysLeft o={o} />
          </div>
          <h1 className="max-w-4xl font-display text-4xl font-medium tracking-tight md:text-6xl">{o.name}</h1>
          {o.sponsor && <p className="text-lg text-muted-foreground">{o.sponsor}</p>}
          <div className="flex flex-wrap gap-3">
            {o.applyUrl && (
              <a
                href={o.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Ir a la postulación <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            )}
            <SaveButton id={o.id} name={o.name} variant="pill" />
            {o.deadline.kind === "exacta" && status !== "cerrada" && (
              <a
                href={`/becas/${o.slug}/calendario`}
                className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm hover:border-larimar hover:text-larimar"
              >
                <CalendarPlus className="size-4" aria-hidden="true" /> Añadir al calendario
              </a>
            )}
            {o.url && o.url !== o.applyUrl && (
              <a
                href={o.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm hover:border-larimar hover:text-larimar"
              >
                Sitio oficial <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </header>

        <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
          <div className="flex min-w-0 flex-col gap-10">
            {(o.audience || o.notes) && (
              <section className="flex flex-col gap-4">
                <h2 className="font-display text-2xl font-medium">Requisitos y notas</h2>
                <p className="eyebrow">Texto original de la fuente, en inglés</p>
                {o.audience && (
                  <div className="flex flex-col gap-1">
                    <h3 className="eyebrow">Dirigido a</h3>
                    <p className="max-w-[68ch] leading-relaxed">{o.audience}</p>
                  </div>
                )}
                {o.notes && (
                  <div className="flex flex-col gap-1">
                    <h3 className="eyebrow">Notas</h3>
                    <p className="max-w-[68ch] leading-relaxed">{o.notes}</p>
                  </div>
                )}
                {o.funding === "con-costo" && (
                  <p className="rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral">
                    Esta oportunidad cobra algún costo. Las becas legítimas rara vez cobran por postular: verifica antes de pagar.
                  </p>
                )}
              </section>
            )}

            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-2xl font-medium">¿Puedo postular?</h2>
                <p className="text-sm text-muted-foreground">{ELIGIBILITY_REASON[o.citizenship]}</p>
              </div>
              <ul className="divide-y rounded-2xl border">
                {profiles.map((p) => (
                  <li key={p} className="flex items-center justify-between gap-4 px-4 py-3">
                    <span className="text-sm">{PROFILE_LABEL[p]}</span>
                    <EligibilityTag value={eligibilityFor(o, p)} className="shrink-0 text-xs" />
                  </li>
                ))}
              </ul>
              {o.citizenshipRaw && (
                <p className="font-mono text-xs text-muted-foreground">Ciudadanía según la fuente: {o.citizenshipRaw}</p>
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-4 self-start rounded-2xl border bg-card p-6 lg:sticky lg:top-20">
            <h2 className="eyebrow">Datos clave</h2>
            <dl className="flex flex-col divide-y">
              {facts
                .filter(([, v]) => isKnown(v))
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[130px_1fr] gap-3 py-2.5 text-sm">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
            <p className="text-xs text-muted-foreground">
              Fuente:{" "}
              {o.source === "rss" ? (o.sourceName ?? "feed RSS") : o.source === "financiamiento" ? "convocatorias de financiamiento revisadas a mano" : "listado de programas internacionales"}
              , actualizado el{" "}
              {dateFmt.format(new Date(o.updatedAt))}. Confirma en el sitio oficial.
            </p>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="flex flex-col gap-6 border-t pt-12">
            <h2 className="font-display text-3xl font-medium tracking-tight">Más opciones en {o.destinations[0]}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <OpportunityCard key={r.id} o={r} />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
