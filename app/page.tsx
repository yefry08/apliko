import Image from "next/image";
import Link from "next/link";
import { DeadlineMarquee } from "@/components/deadline-marquee";
import { deadlineText } from "@/components/opportunity-bits";
import { AreaExplorer, type AreaSummary } from "@/components/portada/area-explorer";
import { Keycaps } from "@/components/portada/keycaps";
import { RegistroNavLink, RegistroSection } from "@/components/registro";
import { SiteFooter } from "@/components/site-chrome";
import { HeroRubik, LazyGlobe } from "@/components/three/lazy-scenes";
import { AREAS } from "@/lib/areas";
import { ADVISORS } from "@/lib/asesores";
import { SESSION, TEAM } from "@/lib/equipo";
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

  const areas: AreaSummary[] = AREAS.map(({ matches, rep, ...area }) => {
    const inArea = open.filter(matches);
    const member = rep ? TEAM.find((m) => m.slug === rep) : undefined;
    return {
      ...area,
      representative: member
        ? {
            slug: member.slug,
            name: member.name,
            role: member.role,
            photo: member.photo,
            initials: member.initials,
            bookable: ADVISORS.some((a) => a.slug === member.slug),
          }
        : null,
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
      <main className="portfolio">
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
            <li>
              <Link href="/asesorias">Asesorías</Link>
            </li>
            <li>
              <Link href="/mi-perfil">Mi perfil</Link>
            </li>
            <li>
              <RegistroNavLink />
            </li>
          </ul>
          <a className="nav-cta" href="#contact">
            Encuentra tu beca ↗
          </a>
        </nav>

        <header className="hero" id="top">
          <Keycaps />
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
          <div className="hero-cube">
            <HeroRubik />
          </div>
        </header>

        <header className="portfolio-heading" id="areas">
          <h2>Oportunidades por área</h2>
          <p>
            {AREAS.length} carpetas, una por área, cada una con alguien del equipo a cargo. Ábrela para ver qué cierra pronto
            y entrar al catálogo filtrado.
          </p>
        </header>

        <AreaExplorer areas={areas} />

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

        <section className="team" id="equipo" aria-labelledby="team-title">
          <div className="section-header">
            <h2 id="team-title">Equipo</h2>
            <p>
              Las personas detrás de ApliKo. Reserva {SESSION.minutes} minutos con cualquiera por USD {SESSION.priceUsd}.{" "}
              <Link href="/asesorias" className="text-larimar hover:underline">
                Asesorías 1-1 ↗
              </Link>
            </p>
          </div>
          <ul className="team-grid" role="list">
            {TEAM.map((m) => (
              <li key={m.name} className="team-card">
                <div className="team-photo">
                  {m.photo ? (
                    <Image src={m.photo} alt={`Foto de ${m.name}`} fill sizes="(max-width: 619px) 50vw, 20vw" />
                  ) : (
                    <span aria-hidden="true">{m.initials}</span>
                  )}
                </div>
                <h3>{m.name}</h3>
                <p className="team-role">{m.role}</p>
                {AREAS.some((a) => a.rep === m.slug) && (
                  <p className="team-division">
                    {AREAS.filter((a) => a.rep === m.slug)
                      .map((a) => a.title)
                      .join(", ")}
                  </p>
                )}
                {m.linkedin && (
                  <a className="team-link" href={m.linkedin} target="_blank" rel="noopener noreferrer">
                    LinkedIn ↗<span className="sr-only"> de {m.name}</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>

        <RegistroSection />

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

      <SiteFooter />
    </>
  );
}
