import { Instrument_Serif } from "next/font/google";
import Link from "next/link";
import { DeadlineMarquee } from "@/components/deadline-marquee";
import { deadlineText } from "@/components/opportunity-bits";
import { AreaExplorer, type AreaSummary } from "@/components/portada/area-explorer";
import { Keycaps } from "@/components/portada/keycaps";
import { SiteFooter } from "@/components/site-chrome";
import { HeroScene } from "@/components/three/hero-scene";
import { LazyGlobe } from "@/components/three/lazy-scenes";
import { AREAS } from "@/lib/areas";
import { COORDS } from "@/lib/geo";
import {
  closingSoon,
  destinationCounts,
  eligibilityFor,
  opportunities,
  PROFILE_LABEL,
  sortForDisplay,
  stats,
  statusOf,
  type Profile,
} from "@/lib/opportunities";
import "./portada.css";

// Status depends on today's date, so refresh hourly.
export const revalidate = 3600;

const serif = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-instrument" });

const PROFILES: Profile[] = ["rd", "latam", "eeuu-ciudadano", "eeuu-residente", "daca"];

const PROCESS = [
  {
    label: "01 / Elige",
    heading: "Empieza por tu situación.",
    text: "Ciudadanía dominicana, otro país de Latinoamérica, residencia en EE. UU. o DACA: cada ficha dice si puedes postular.",
    sticker: "Primero tú.",
  },
  {
    label: "02 / Filtra",
    heading: "Quédate con lo que sí aplica.",
    text: "Nivel, área, país y financiamiento. Guarda las que te interesan en Mis becas para compararlas con calma.",
    sticker: "Guarda → Compara",
  },
  {
    label: "03 / Postula",
    heading: "Llega antes del cierre.",
    text: "Añade las fechas a tu calendario y marca cada postulación según avanzas, de Guardada a Enviada.",
    sticker: "Aplica. Da seguimiento.",
  },
];

function CurvedArrow({ color }: { color: string }) {
  return (
    <svg className="process-arrow" viewBox="0 0 48 32" aria-hidden="true">
      <path d="M4 24 C 14 6, 30 4, 42 14" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <path d="M34 9 L 43 14 L 35 21" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  const s = stats();
  const soon = closingSoon(5);
  const open = sortForDisplay(opportunities.filter((o) => statusOf(o) !== "cerrada"));

  const areas: AreaSummary[] = AREAS.map(({ matches, ...area }) => {
    const inArea = open.filter(matches);
    return {
      ...area,
      count: inArea.length,
      upcoming: inArea
        .filter((o) => o.deadline.kind === "exacta")
        .slice(0, 5)
        .map((o) => ({ slug: o.slug, name: o.name, sponsor: o.sponsor, deadline: deadlineText(o) })),
    };
  });

  const counts = [...destinationCounts().entries()]
    .filter(([name]) => COORDS[name])
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const perProfile = PROFILES.map((p) => ({
    profile: p,
    eligible: open.filter((o) => eligibilityFor(o, p) === "elegible").length,
    notEligible: open.filter((o) => eligibilityFor(o, p) === "no-elegible").length,
  }));

  return (
    <>
      <link rel="preconnect" href="https://api.fontshare.com" />
      <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" precedence="default" />

      <main className={`portfolio ${serif.variable}`}>
        <nav className="portfolio-nav" aria-label="Principal">
          <a className="brand" href="#top">
            ApliKo<span>.</span>
          </a>
          <ul className="nav-links" role="list">
            <li>
              <a href="#areas">Áreas</a>
            </li>
            <li>
              <a href="#process">Cómo funciona</a>
            </li>
            <li>
              <Link href="/mis-becas">Mis becas</Link>
            </li>
          </ul>
          <a className="nav-cta" href="#contact">
            Encuentra tu beca ↗
          </a>
        </nav>

        <header className="hero" id="top">
          <div className="hero-copy">
            <h1>Becas, fellowships y fondos para estudiantes dominicanos y latinos.</h1>
            <p>Filtra por tu ciudadanía y descubre a cuáles sí puedes postular, antes de que cierren.</p>
            <div className="hero-actions">
              <Link className="button-primary" href="/becas">
                Explorar el catálogo ↗
              </Link>
              <Link className="button-quiet" href="/becas?perfil=rd">
                ¿Soy elegible?
              </Link>
            </div>
            <dl className="hero-stats">
              <div>
                <dd>{s.open}</dd>
                <dt>abiertas hoy</dt>
              </div>
              <div>
                <dd>{s.total}</dd>
                <dt>en el catálogo</dt>
              </div>
              <div>
                <dd>{s.fullyFunded}</dd>
                <dt>totalmente financiadas</dt>
              </div>
              <div>
                <dd>{s.countries}</dd>
                <dt>destinos</dt>
              </div>
            </dl>
          </div>
          <HeroScene />
          <Keycaps />
        </header>

        <header className="portfolio-heading" id="areas">
          <h2>Oportunidades por área</h2>
          <p>Ocho carpetas, una por área. Ábrela para ver qué cierra pronto y entrar al catálogo filtrado.</p>
        </header>

        <AreaExplorer areas={areas} dialogClassName={serif.variable} />

        <section className="deadlines" aria-labelledby="deadlines-title">
          <div className="section-header">
            <h2 id="deadlines-title">Las 5 que cierran antes</h2>
            <p>En orden de fecha. Aplica al menos un día antes: muchas cierran en la hora del país que organiza.</p>
          </div>
          <DeadlineMarquee items={soon} />
        </section>

        <section className="destinations" id="destinos" aria-labelledby="destinations-title">
          <div className="destinations-globe">
            <LazyGlobe destinations={counts} />
          </div>
          <div className="destinations-copy">
            <h2 id="destinations-title">A dónde van</h2>
            <p>Cada ruta sale de Santo Domingo hacia un país con oportunidades abiertas. Toca un punto del globo para ver sus becas.</p>
            <ol className="destinations-list" role="list">
              {counts.slice(0, 10).map((d) => (
                <li key={d.name}>
                  <Link href={`/becas?destino=${encodeURIComponent(d.name)}`}>
                    <span>{d.name}</span>
                    <span className="count">{d.count}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="eligibility" aria-labelledby="eligibility-title">
          <div className="section-header">
            <h2 id="eligibility-title">¿Soy elegible?</h2>
            <p>Santo Domingo y el Bronx no ven las mismas becas. Elige tu situación y te mostramos a cuáles puedes postular.</p>
          </div>
          <ul className="eligibility-grid" role="list">
            {perProfile.map(({ profile, eligible, notEligible }) => (
              <li key={profile}>
                <Link className="eligibility-card" href={`/becas?perfil=${profile}`}>
                  <span className="eligibility-profile">{PROFILE_LABEL[profile]}</span>
                  <span className="eligibility-count">{eligible}</span>
                  <span className="eligibility-label">puedes postular</span>
                  <span className="eligibility-note">{notEligible} no aplican</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="design-process" id="process" aria-labelledby="process-title">
          <div className="process-header">
            <h2 id="process-title">Cómo funciona ApliKo</h2>
            <p>Dinos quién eres. Filtra lo que aplica. Postula a tiempo.</p>
          </div>
          <div className="process-frame">
            <ol className="process-surface" role="list">
              {PROCESS.map((step, i) => (
                <li className="process-card" key={step.label}>
                  <span className="process-label">{step.label}</span>
                  <h3>{step.heading}</h3>
                  <p>{step.text}</p>
                  <span className={`sticker sticker-${i + 1}`}>{step.sticker}</span>
                  {i === 0 && <CurvedArrow color="#ECAB16" />}
                  {i === 1 && <CurvedArrow color="#EFACCB" />}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="contact-section" id="contact" aria-labelledby="contact-title">
          <h2 id="contact-title">Encuentra tu beca</h2>
          <p>Explora el catálogo con tu situación, guarda las que te interesan y no pierdas ninguna fecha.</p>
          <div className="hero-actions">
            <Link className="button-primary" href="/becas">
              Ir al catálogo ↗
            </Link>
            <Link className="button-quiet" href="/mis-becas">
              Mis becas
            </Link>
          </div>
        </section>
      </main>

      <div className="portfolio-footer">
        <SiteFooter />
      </div>
    </>
  );
}
