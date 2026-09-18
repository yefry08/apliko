import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PrismaHero } from "@/components/ui/prisma-hero";
import { DeadlineMarquee } from "@/components/deadline-marquee";
import { LazyFloating, LazyGlobe } from "@/components/three/lazy-scenes";
import { SiteFooter } from "@/components/site-chrome";
import { COORDS } from "@/lib/geo";
import {
  closingSoon,
  destinationCounts,
  eligibilityFor,
  opportunities,
  PROFILE_LABEL,
  stats,
  statusOf,
  type Profile,
} from "@/lib/opportunities";

// Status depends on today's date, so refresh hourly.
export const revalidate = 3600;

const PROFILES: Profile[] = ["rd", "latam", "eeuu-ciudadano", "eeuu-residente", "daca"];

export default function Home() {
  const s = stats();
  const soon = closingSoon(5);
  const counts = [...destinationCounts().entries()]
    .filter(([name]) => COORDS[name])
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const notClosed = opportunities.filter((o) => statusOf(o) !== "cerrada");
  const perProfile = PROFILES.map((p) => ({
    profile: p,
    eligible: notClosed.filter((o) => eligibilityFor(o, p) === "elegible").length,
    notEligible: notClosed.filter((o) => eligibilityFor(o, p) === "no-elegible").length,
  }));

  return (
    <>
      <PrismaHero />

      <main className="flex flex-col">
        {/* Figures */}
        <section aria-label="Resumen" className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <dl className="grid grid-cols-2 border-b md:grid-cols-4">
            {[
              [s.total, "oportunidades en la base"],
              [s.open, "abiertas o continuas hoy"],
              [s.fullyFunded, "totalmente financiadas"],
              [s.countries, "destinos distintos"],
            ].map(([n, label]) => (
              <div key={label} className="flex flex-col gap-1 border-t py-6 pr-4 md:border-t-0">
                <dt className="eyebrow order-2">{label}</dt>
                <dd className="order-1 font-display text-4xl font-medium tabular-nums tracking-tight md:text-5xl">{n}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Closing soon */}
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex max-w-2xl flex-col gap-3">
              <p className="eyebrow">Hora de República Dominicana</p>
              <h2 className="font-display text-4xl font-medium tracking-tight md:text-5xl">Las 5 que cierran antes</h2>
              <p className="text-muted-foreground">
                En orden de fecha de cierre. Aplica al menos un día antes: muchas cierran en la hora del país que organiza.
              </p>
            </div>
            <Link href="/becas" className="inline-flex items-center gap-2 text-sm text-larimar hover:underline">
              Ver las {s.total} oportunidades <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <DeadlineMarquee items={soon} />
        </section>

        {/* Globe */}
        <section id="destinos" className="scroll-mt-16 border-y bg-card/40">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="relative aspect-square w-full max-w-[640px] justify-self-center">
              <LazyGlobe destinations={counts} />
            </div>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <p className="eyebrow">Desde Santo Domingo</p>
                <h2 className="font-display text-4xl font-medium tracking-tight md:text-5xl">A dónde van</h2>
                <p className="text-muted-foreground">
                  Cada ruta sale de Santo Domingo hacia un país con oportunidades que no han cerrado. Toca un punto del globo para
                  ver sus becas.
                </p>
              </div>
              <ol className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                {counts.slice(0, 10).map((d) => (
                  <li key={d.name}>
                    <Link
                      href={`/becas?destino=${encodeURIComponent(d.name)}`}
                      className="flex items-baseline justify-between gap-3 border-b py-2.5 hover:text-larimar"
                    >
                      <span>{d.name}</span>
                      <span className="font-mono text-sm tabular-nums text-muted-foreground">{d.count}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Eligibility */}
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-20 sm:px-6">
          <div className="flex max-w-2xl flex-col gap-3">
            <p className="eyebrow">¿Soy elegible?</p>
            <h2 className="font-display text-4xl font-medium tracking-tight md:text-5xl">
              Santo Domingo y el Bronx no ven las mismas becas
            </h2>
            <p className="text-muted-foreground">
              Gilman, Boren o Marshall piden ciudadanía estadounidense. Chevening o Fulbright para extranjeros piden lo contrario.
              Elige tu situación y te mostramos a cuáles puedes postular.
            </p>
          </div>
          <ul className="grid gap-3 md:grid-cols-5">
            {perProfile.map(({ profile, eligible, notEligible }) => (
              <li key={profile}>
                <Link
                  href={`/becas?perfil=${profile}`}
                  className="flex h-full flex-col gap-4 rounded-2xl border p-5 transition-colors hover:border-larimar/60 hover:bg-card"
                >
                  <span className="text-sm leading-snug">{PROFILE_LABEL[profile]}</span>
                  <span className="mt-auto flex flex-col gap-0.5">
                    <span className="font-display text-3xl font-medium tabular-nums text-palm">{eligible}</span>
                    <span className="eyebrow">puedes postular</span>
                    <span className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">{notEligible} no aplican</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Contamos solo oportunidades que no han cerrado. Las que tienen lista de países o condiciones aparecen como “Revisa
            requisitos”.
          </p>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden border-t">
          <div className="absolute inset-0 opacity-80">
            <LazyFloating />
          </div>
          <div className="pointer-events-none relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-28 text-center sm:px-6">
            <h2 className="font-display text-5xl font-medium tracking-tight md:text-7xl">La carta de aceptación empieza aquí</h2>
            <p className="max-w-xl text-muted-foreground">
              Filtra por nivel, área, país y financiamiento. Guarda las que te interesen y postula antes de que cierren.
            </p>
            <Link
              href="/becas"
              className="pointer-events-auto group inline-flex items-center gap-2 rounded-full bg-primary py-1 pl-5 pr-1 font-medium text-primary-foreground transition-all hover:gap-3"
            >
              Explorar becas
              <span className="flex size-10 items-center justify-center rounded-full bg-black">
                <ArrowRight className="size-4 text-[#E1E0CC]" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
