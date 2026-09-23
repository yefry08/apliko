/**
 * Normaliza las fuentes de data/raw en data/opportunities.json.
 *   npm run data:import
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CitizenshipRule, Deadline, Funding, Level, Opportunity } from "../lib/types";

const RAW = path.join(process.cwd(), "data", "raw");

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

const split = (s = "") =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const COUNTRY_ES: Record<string, string> = {
  "United States": "Estados Unidos",
  Germany: "Alemania",
  "United Kingdom": "Reino Unido",
  UK: "Reino Unido",
  France: "Francia",
  Spain: "España",
  Japan: "Japón",
  China: "China",
  Taiwan: "Taiwán",
  "South Korea": "Corea del Sur",
  Ireland: "Irlanda",
  Switzerland: "Suiza",
  Austria: "Austria",
  Belgium: "Bélgica",
  Sweden: "Suecia",
  Hungary: "Hungría",
  Turkey: "Turquía",
  Romania: "Rumania",
  Canada: "Canadá",
  Australia: "Australia",
  "New Zealand": "Nueva Zelanda",
  India: "India",
  Indonesia: "Indonesia",
  "Saudi Arabia": "Arabia Saudita",
  "South Africa": "Sudáfrica",
  Poland: "Polonia",
  Kazakhstan: "Kazajistán",
  Argentina: "Argentina",
  Japon: "Japón",
  Peru: "Perú",
  Corea: "Corea del Sur",
  Mexico: "México",
  Turquia: "Turquía",
  Sudafrica: "Sudáfrica",
  Panama: "Panamá",
  Lithuania: "Lituania",
  Italy: "Italia",
  Portugal: "Portugal",
  Netherlands: "Países Bajos",
  Czechia: "República Checa",
  Estonia: "Estonia",
  Bulgaria: "Bulgaria",
  Slovakia: "Eslovaquia",
  Latvia: "Letonia",
  Croatia: "Croacia",
  Finland: "Finlandia",
  Cyprus: "Chipre",
  Luxembourg: "Luxemburgo",
  Liechtenstein: "Liechtenstein",
  Albania: "Albania",
  Georgia: "Georgia",
  "Türkiye": "Turquía",
  Egypt: "Egipto",
  Ghana: "Ghana",
  Kenya: "Kenia",
  Uganda: "Uganda",
  Tanzania: "Tanzania",
  "Sint Maarten": "Sint Maarten",
  Norway: "Noruega",
  Denmark: "Dinamarca",
  "Belgium (Flanders)": "Bélgica",
  "EU-wide": "Europa",
  "Pan-European (EUREKA)": "Europa",
  UAE: "Emiratos Árabes Unidos",
  Belgica: "Bélgica",
  Hungria: "Hungría",
  "Paises Bajos": "Países Bajos",
  Worldwide: "Mundial",
  "Virtual / Online": "Remoto",
  "Remote / Hybrid": "Remoto",
  Europe: "Europa",
  Asia: "Asia",
  "Southeast Asia": "Asia",
  Africa: "África",
  "Latin America & Caribbean": "Latinoamérica y el Caribe",
  Caribbean: "Latinoamérica y el Caribe",
  "Pacific Islands": "Pacífico",
};
const TYPE_ES: Record<string, string> = {
  "Academic Exchange": "Intercambio académico", "Career Development Program": "Desarrollo profesional",
  "Competition / Prize": "Premio", "Cultural Exchange": "Intercambio cultural", "Degree Program": "Programa de grado",
  "Gap Year / Service Program": "Año de servicio", "Graduate Scholarship": "Beca de posgrado", Internship: "Internship",
  "Language Immersion": "Inmersión en idiomas", "Leadership Fellowship": "Fellowship de liderazgo",
  "Leadership Program": "Programa de liderazgo", "Mentorship Program": "Mentoría", Other: "Otro",
  "Policy Fellowship": "Fellowship en políticas", "Professional Fellowship": "Fellowship profesional",
  "Project Grant": "Fondos para proyectos", "Research Fellowship": "Fellowship de investigación",
  "Research Grant": "Fondos de investigación", "Study Abroad": "Estudios en el extranjero",
  "Summer Institute": "Instituto de verano", "Summer Program": "Programa de verano", "Teaching Program": "Enseñanza",
  "Travel Grant": "Beca de viaje", "Undergraduate Scholarship": "Beca de pregrado", "Virtual Program": "Programa virtual",
  "Volunteer Service": "Voluntariado", "Youth Exchange": "Intercambio juvenil",
};

const AREA_ES: Record<string, string> = {
  "AI / Data Science": "IA y ciencia de datos", "Area Studies": "Estudios regionales", "Arts / Culture": "Artes y cultura",
  Business: "Negocios", "Climate / Environment": "Clima y medio ambiente", "Critical Languages": "Idiomas críticos",
  Development: "Desarrollo", Economics: "Economía", Education: "Educación", Entrepreneurship: "Emprendimiento",
  "Human Rights": "Derechos humanos", "International Relations": "Relaciones internacionales",
  "Journalism / Media": "Periodismo y medios", "Law / Policy": "Derecho y políticas", Leadership: "Liderazgo",
  Other: "Otras", "Peace / Conflict": "Paz y conflicto", "Public Diplomacy": "Diplomacia pública",
  "Public Health": "Salud pública", "Public Policy": "Políticas públicas", "Regional Studies": "Estudios regionales",
  STEM: "STEM", "Security / National Security": "Seguridad", "Social Impact": "Impacto social",
  Sustainability: "Sostenibilidad", Technology: "Tecnología",
};

const translate = (map: Record<string, string>, values: string[]) => [...new Set(values.map((v) => map[v] ?? v))];

const GENERIC_DEST = new Set(["Multiple Locations", "Host Country Varies", "Varies by Program", "Country-Specific"]);

/* ---------------- International list (PSV) ---------------- */

function fundingFromEn(s: string): Funding {
  if (/fully/i.test(s)) return "completa";
  if (/highly/i.test(s)) return "alta";
  if (/partial/i.test(s)) return "parcial";
  if (/stipend|paid/i.test(s)) return "estipendio";
  if (/need/i.test(s)) return "segun-necesidad";
  if (/fee/i.test(s)) return "con-costo";
  return "varia";
}

function levelsFromEn(s: string): Level[] {
  const out = new Set<Level>();
  if (/high school|gap year/i.test(s)) out.add("secundaria");
  if (/undergraduate/i.test(s)) out.add("pregrado");
  if (/\bgraduate\b|master/i.test(s)) out.add("maestria");
  if (/phd|doctoral|postgraduate/i.test(s)) out.add("doctorado");
  if (/recent graduate/i.test(s)) out.add("recien-graduado");
  if (/professional|other/i.test(s)) out.add("profesional");
  if (/educator/i.test(s)) out.add("docente");
  return [...out];
}

function citizenshipFromEn(s: string): CitizenshipRule {
  const us = /U\.S\. (Citizen|National)/i.test(s);
  const pr = /Permanent Resident/i.test(s);
  const daca = /DACA/i.test(s);
  const other = /Eligible Country|Partner Country|Global|Open to All|Non-U\.S\.|Refugee/i.test(s);
  if (/Global Applicants|Open to All/i.test(s)) return "global";
  if (/Non-U\.S\./i.test(s) && !us) return "no-eeuu";
  if (other) return "paises-elegibles";
  if (daca) return "eeuu-daca";
  if (pr) return "eeuu-residente";
  if (us) return "solo-eeuu";
  return "paises-elegibles";
}

function readInternational(): Opportunity[] {
  const files = ["international-1.psv", "international-2.psv", "international-3.psv"];
  const lines = files.flatMap((f) => readFileSync(path.join(RAW, f), "utf8").split(/\r?\n/));
  const header = lines.shift()!.split("|");
  return lines
    .filter((l) => l.trim())
    .map((line) => {
      const cells = line.split("|");
      const r = Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? "").trim()]));
      const exact = /^\d{4}-\d{2}-\d{2}$/.test(r.exactDeadline);
      const deadline: Deadline = exact
        ? { kind: "exacta", date: r.exactDeadline }
        : /rolling/i.test(r.season)
          ? { kind: "continua", label: r.season }
          : /fall|winter|spring|summer|annual/i.test(r.season)
            ? { kind: "temporada", label: r.season }
            : { kind: "por-confirmar", label: r.season || undefined };
      const destinations = [
        ...new Set(split(r.locations).filter((d) => !GENERIC_DEST.has(d)).map((d) => COUNTRY_ES[d] ?? d)),
      ];
      return {
        id: `int-${slugify(r.name)}`,
        slug: slugify(r.name),
        name: r.name,
        sponsor: r.sponsor || undefined,
        source: "internacional",
        types: translate(TYPE_ES, split(r.programType)),
        areas: translate(AREA_ES, split(r.subjects)),
        levels: levelsFromEn(r.levels),
        destinations: destinations.length ? destinations : ["Varios países"],
        funding: /fee/i.test(r.notes) && /\$\d/.test(r.notes) ? "con-costo" : fundingFromEn(r.funding),
        citizenship: citizenshipFromEn(r.citizenship),
        citizenshipRaw: r.citizenship,
        audience: r.eligibility,
        gpa: r.gpa,
        language: r.language,
        recommendations: r.recs,
        essays: r.essays,
        duration: r.duration,
        difficulty: r.difficulty || undefined,
        deadline,
        notes: r.notes || undefined,
        url: r.website || undefined,
        applyUrl: r.apply || r.website || undefined,
        updatedAt: r.updated,
      } satisfies Opportunity;
    });
}

interface FinanciamientoRow {
  name: string;
  sponsor: string;
  type: string;
  areas: string;
  region: string;
  citizenship?: CitizenshipRule;
  deadline: string;
  amount: string;
  url: string | null;
  levels?: Level[];
  destinations?: string[];
  funding?: Funding;
}

/** Fondos, premios y convocatorias curados a mano (data/raw/financiamiento.json). */
function readFinanciamiento(): Opportunity[] {
  const file = path.join(RAW, "financiamiento.json");
  if (!existsSync(file)) return [];
  const rows = JSON.parse(readFileSync(file, "utf8")) as FinanciamientoRow[];
  return rows.map((r) => {
    const slug = slugify(r.name);
    const deadline: Deadline =
      r.deadline === "continua" ? { kind: "continua" } : { kind: "exacta", date: r.deadline };
    return {
      id: `fin-${slug}`,
      slug,
      name: r.name,
      sponsor: r.sponsor,
      source: "financiamiento",
      types: [r.type],
      areas: r.areas.split("/").map((a) => a.trim()).filter(Boolean),
      levels: r.levels ?? [],
      destinations: r.destinations ?? ["Mundial"],
      funding: r.funding ?? "varia",
      amount: r.amount,
      citizenship: r.citizenship ?? "global",
      citizenshipRaw: r.region,
      deadline,
      url: r.url ?? undefined,
      applyUrl: r.url ?? undefined,
      updatedAt: "2026-09-18",
    } satisfies Opportunity;
  });
}

type VoluntariadoCategory = "humanitaria" | "educacion" | "ambiente" | "cultura" | "inclusion" | "comunidad";

interface VoluntariadoRow {
  name: string;
  /** Host country, in English as the source lists it. */
  host: string;
  category: VoluntariadoCategory;
  deadline: string;
  summary: string;
  /** Countries of residence the project accepts, when the source lists them. */
  openTo?: string;
  duration?: string;
  language?: string;
  amount?: string;
  minAge?: number;
}

// Areas per category, worded so lib/areas.ts files each project in the right folder.
const VOLUNTARIADO_AREAS: Record<VoluntariadoCategory, string[]> = {
  humanitaria: ["Voluntariado", "Ayuda humanitaria", "Desarrollo comunitario"],
  educacion: ["Voluntariado", "Educación", "Juventud"],
  ambiente: ["Voluntariado", "Medio ambiente", "Sostenibilidad"],
  cultura: ["Voluntariado", "Cultura", "Artes", "Medios"],
  inclusion: ["Voluntariado", "Inclusión", "Discapacidad"],
  comunidad: ["Voluntariado", "Juventud", "Desarrollo comunitario"],
};

const ESC_HUMANITARIAN_URL = "https://youth.europa.eu/solidarity/young-people/volunteering-humanitarian-aid_en";
const ESC_OPPORTUNITIES_URL = "https://youth.europa.eu/go-abroad/volunteering/opportunities_en";

/**
 * Proyectos del Cuerpo Europeo de Solidaridad (data/raw/voluntariado.json). La lista de origen
 * no trae un enlace por proyecto, así que todos llevan al buscador oficial del programa.
 */
function readVoluntariado(): Opportunity[] {
  const file = path.join(RAW, "voluntariado.json");
  if (!existsSync(file)) return [];
  const rows = JSON.parse(readFileSync(file, "utf8")) as VoluntariadoRow[];
  return rows.map((r) => {
    const slug = slugify(r.name);
    const humanitarian = r.category === "humanitaria";
    const maxAge = humanitarian ? 35 : 30;
    const url = humanitarian ? ESC_HUMANITARIAN_URL : ESC_OPPORTUNITIES_URL;
    return {
      id: `vol-${slug}`,
      slug,
      name: r.name,
      sponsor: "Cuerpo Europeo de Solidaridad (Unión Europea)",
      source: "voluntariado",
      types: humanitarian ? ["Voluntariado", "Ayuda humanitaria"] : ["Voluntariado"],
      areas: VOLUNTARIADO_AREAS[r.category],
      levels: [],
      destinations: [COUNTRY_ES[r.host] ?? r.host],
      funding: "completa",
      amount: r.amount ?? "Alojamiento, comida, viaje, seguro y dinero de bolsillo cubiertos",
      citizenship: "paises-elegibles",
      citizenshipRaw: humanitarian
        ? "De 18 a 35 años, con residencia legal en un país de la UE o asociado al programa (Islandia, Liechtenstein, Macedonia del Norte, Turquía)."
        : `De ${r.minAge ?? 18} a ${maxAge} años, con residencia legal en uno de los países que acepta el proyecto.`,
      audience: `Ages ${r.minAge ?? 18} to ${maxAge}.${r.openTo ? ` Open to residents of ${r.openTo}.` : ""}`,
      language: r.language,
      duration: r.duration,
      deadline: { kind: "exacta", date: r.deadline },
      notes: r.summary,
      url,
      applyUrl: url,
      updatedAt: "2026-09-23",
    } satisfies Opportunity;
  });
}

interface StartupRow {
  name: string;
  /** Where the applicant must be based; " | " separates several. */
  geography: string;
  stage: string[];
  startupType: string[];
  amount: string;
  description: string;
  url: string;
  /** The program funds teams from any country (the rest require a local company). */
  openInternationally?: boolean;
}

// Worded so lib/areas.ts can also file them by theme (STEAM, Salud, Clima, Impacto social).
const STARTUP_AREA_ES: Record<string, string> = {
  "Deep Tech": "Tecnología profunda",
  Hardware: "Hardware",
  "Biotech / Life Sciences": "Biotecnología y ciencias de la vida",
  "Digital / AI": "Digital e IA",
  Health: "Salud",
  "Climate / Green Tech": "Clima y tecnología verde",
  "Space Tech": "Tecnología espacial",
  "Research / Spin-off": "Investigación y spin-offs",
  "Any Sector": "Cualquier sector",
  "R&D / SME": "I+D en pymes",
  "Women-led": "Startups lideradas por mujeres",
  "Environment / Circular Economy": "Medio ambiente y economía circular",
};

/** Fondos públicos para startups y pymes (data/raw/startups.json, de la base "Grant Programs Database" en Notion). */
function readStartups(): Opportunity[] {
  const file = path.join(RAW, "startups.json");
  if (!existsSync(file)) return [];
  const rows = JSON.parse(readFileSync(file, "utf8")) as StartupRow[];
  return rows.map((r) => {
    const slug = slugify(r.name);
    const places = [...new Set(r.geography.split(" | ").map((g) => COUNTRY_ES[g] ?? g))];
    const deadline: Deadline = /rolling basis/i.test(r.description)
      ? { kind: "continua" }
      : { kind: "por-confirmar", label: "Según cada convocatoria" };
    return {
      id: `sgp-${slug}`,
      slug,
      name: r.name,
      source: "financiamiento",
      sourceName: "Grant Programs Database (Notion)",
      types: ["Fondos para startups"],
      areas: translate(STARTUP_AREA_ES, r.startupType),
      levels: ["profesional"],
      destinations: places,
      funding: "varia",
      amount: r.amount,
      citizenship: r.openInternationally ? "ver-notas" : "paises-elegibles",
      citizenshipRaw: r.openInternationally
        ? "Equipos de cualquier país que respondan a un reto publicado."
        : `Startups, pymes o equipos de investigación con sede en ${places.join(" o ")}.`,
      audience: `Stage: ${r.stage.join(", ")}.`,
      deadline,
      notes: r.description,
      url: r.url,
      applyUrl: r.url,
      updatedAt: "2026-09-23",
    } satisfies Opportunity;
  });
}

function main() {
  // De los feeds RSS (scripts/ingest_rss.py) solo entran las candidatas aprobadas.
  const rssFile = path.join(process.cwd(), "data", "rss", "candidates.json");
  const approved = existsSync(rssFile)
    ? (JSON.parse(readFileSync(rssFile, "utf8")) as { estado: string; oportunidad: Opportunity }[])
        .filter((c) => c.estado === "aprobada")
        .map((c) => c.oportunidad)
    : [];
  const all = [...readInternational(), ...readFinanciamiento(), ...readStartups(), ...readVoluntariado(), ...approved];
  const seen = new Set<string>();
  const unique = all.filter((o) => {
    let slug = o.slug;
    for (let i = 2; seen.has(slug); i++) slug = `${o.slug}-${i}`;
    o.slug = slug;
    seen.add(slug);
    return true;
  });
  writeFileSync(path.join(process.cwd(), "data", "opportunities.json"), JSON.stringify(unique, null, 1));
  const bySource = unique.reduce<Record<string, number>>((a, o) => ((a[o.source] = (a[o.source] ?? 0) + 1), a), {});
  console.log(`Importadas ${unique.length} oportunidades`, bySource);
}

main();
