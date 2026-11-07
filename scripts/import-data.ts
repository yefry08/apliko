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
  Benin: "Benín",
  Pakistan: "Pakistán",
  Thailand: "Tailandia",
  Uzbekistan: "Uzbekistán",
  Algeria: "Argelia",
  Morocco: "Marruecos",
  Ethiopia: "Etiopía",
  Tunisia: "Túnez",
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
  /** ISO date, "continua", or a label when the window repeats without a fixed date yet. */
  deadline: string | { label: string };
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
      typeof r.deadline === "object"
        ? { kind: "por-confirmar", label: r.deadline.label }
        : r.deadline === "continua"
          ? { kind: "continua" }
          : { kind: "exacta", date: r.deadline };
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

interface BecaRow {
  name: string;
  sponsor: string;
  /** Destination, in Spanish as lib/geo.ts names it. */
  country: string;
  levels: Level[];
  type: string;
  areas: string[];
  funding: Funding;
  amount?: string;
  /** ISO date, "continua", or a label when there is no fixed date. */
  deadline: string | { label: string };
  citizenship: CitizenshipRule;
  /** Who can apply, in Spanish. */
  eligibility: string;
  language?: string;
  url: string;
}

/** Becas revisadas a mano, cada una con su enlace oficial (data/raw/becas.json). */
function readBecas(): Opportunity[] {
  const file = path.join(RAW, "becas.json");
  if (!existsSync(file)) return [];
  const rows = JSON.parse(readFileSync(file, "utf8")) as BecaRow[];
  return rows.map((r) => {
    const slug = slugify(r.name);
    const deadline: Deadline =
      typeof r.deadline === "object"
        ? { kind: "por-confirmar", label: r.deadline.label }
        : r.deadline === "continua"
          ? { kind: "continua" }
          : { kind: "exacta", date: r.deadline };
    return {
      id: `bec-${slug}`,
      slug,
      name: r.name,
      sponsor: r.sponsor,
      source: "becas",
      types: [r.type],
      areas: r.areas,
      levels: r.levels,
      destinations: [r.country],
      funding: r.funding,
      amount: r.amount,
      citizenship: r.citizenship,
      citizenshipRaw: r.eligibility,
      language: r.language,
      deadline,
      url: r.url,
      applyUrl: r.url,
      updatedAt: "2026-09-23",
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

interface EaRow {
  title: string;
  organization: string;
  types: string[];
  causeAreas: string[];
  location: string;
  locationFilter: string[];
  deadline: string | null;
  pay: string | null;
  link: string;
  description: string;
}

const EA_TYPE_ES: Record<string, string> = {
  Fellowship: "Fellowship", Internship: "Pasantía", Course: "Curso", Event: "Evento", Funding: "Fondos",
  Volunteer: "Voluntariado", Contest: "Concurso", Advising: "Asesoría", "Independent project": "Proyecto independiente",
  "Full-time": "Tiempo completo", "Part-time": "Medio tiempo",
};

// Worded so lib/areas.ts files each cause in a folder (Salud, Clima, Política, Diplomacia…).
const EA_CAUSE_ES: Record<string, string> = {
  "AI safety & policy": "Seguridad de la IA y políticas",
  "Building effective altruism": "Altruismo eficaz",
  "Global health & development": "Salud global y desarrollo",
  "Animal welfare": "Bienestar animal",
  "Biosecurity & pandemic preparedness": "Bioseguridad y salud pública",
  "Institutional decision-making": "Gobernanza y decisiones institucionales",
  "International security & cooperation": "Seguridad y relaciones internacionales",
  "Global priorities research": "Investigación de prioridades globales",
  "Information security": "Seguridad informática",
  "Nuclear security": "Seguridad nuclear",
  "Climate change": "Cambio climático",
  "Mental health & wellbeing": "Salud mental y bienestar",
  "Global catastrophic risks": "Riesgos catastróficos globales",
  "Other (pressing)": "Otros problemas urgentes",
  "All cause areas": "Todas las causas",
};

const EA_PLACE_ES: Record<string, string> = {
  Remote: "En línea", USA: "Estados Unidos", "Europe (excluding UK)": "Europa", "Australia & Oceania": "Australia",
  "South America": "Latinoamérica y el Caribe", "Central America & Caribbean": "Latinoamérica y el Caribe",
  "Middle East": "Medio Oriente", Mexico: "México", Canada: "Canadá", Singapore: "Singapur", "South Africa": "Sudáfrica",
  "Czech Republic": "República Checa", "New Zealand": "Nueva Zelanda", Vietnam: "Vietnam", Nigeria: "Nigeria",
  Uganda: "Uganda", "Burkina Faso": "Burkina Faso", Liberia: "Liberia", India: "India", Asia: "Asia", Africa: "África",
};

/**
 * Becas, pasantías, cursos, fondos y voluntariados del EA Opportunities Board
 * (data/raw/ea-oportunidades.json, sin los empleos). El tipo decide en qué categoría cae.
 */
function readEa(): Opportunity[] {
  const file = path.join(RAW, "ea-oportunidades.json");
  if (!existsSync(file)) return [];
  const rows = JSON.parse(readFileSync(file, "utf8")) as EaRow[];
  return rows.map((r) => {
    const has = (t: string) => r.types.includes(t);
    const source: Opportunity["source"] =
      has("Fellowship") || has("Internship") || has("Course") ? "becas"
        : has("Funding") || has("Contest") ? "financiamiento"
          : has("Volunteer") ? "voluntariado"
            : "becas";
    // Generic titles ("Volunteer", "Fellowship") need the organization to mean anything.
    const generic = r.title.length <= 30 && !r.organization.split(/[\s,()]+/).some((w) => w.length > 3 && r.title.includes(w));
    const name = generic && r.organization ? `${r.title} · ${r.organization}` : r.title;
    const slug = slugify(name);
    const places = [...new Set(r.locationFilter.map((l) => EA_PLACE_ES[l] ?? COUNTRY_ES[l] ?? l))];
    return {
      id: `ea-${slug}`,
      slug,
      name,
      sponsor: r.organization || undefined,
      source,
      sourceName: "EA Opportunities Board (effectivealtruism.org)",
      types: translate(EA_TYPE_ES, r.types),
      areas: translate(EA_CAUSE_ES, r.causeAreas),
      levels: [],
      destinations: places.length ? places : ["Mundial"],
      funding: "varia",
      amount: r.pay ? `Pago: ${r.pay}` : undefined,
      citizenship: "ver-notas",
      citizenshipRaw: r.location ? `Ubicación: ${r.location}. Revisa los requisitos en la convocatoria.` : "Revisa los requisitos en la convocatoria.",
      deadline: r.deadline ? { kind: "exacta", date: r.deadline } : { kind: "por-confirmar", label: "Sin fecha de cierre publicada" },
      notes: r.description || undefined,
      url: r.link,
      applyUrl: r.link,
      updatedAt: "2026-10-01",
    } satisfies Opportunity;
  });
}

interface YounoodleRow {
  name: string;
  identifier: string;
  /** ISO date in the program's own time zone. */
  deadline: string;
  url: string;
  description: string;
}

/**
 * Competencias abiertas de YouNoodle (scripts/actualizar_younoodle.py, cada día). Las que ya están curadas en
 * financiamiento.json con la misma URL se saltan: la ficha curada trae requisitos en español.
 */
function readYounoodle(curatedUrls: Set<string>): Opportunity[] {
  const file = path.join(RAW, "younoodle.json");
  if (!existsSync(file)) return [];
  const rows = JSON.parse(readFileSync(file, "utf8")) as YounoodleRow[];
  return rows
    .filter((r) => !curatedUrls.has(r.url))
    .map((r) => {
      const slug = slugify(r.name);
      return {
        id: `yn-${slug}`,
        slug,
        name: r.name,
        source: "financiamiento",
        sourceName: "YouNoodle (apply.younoodle.com)",
        types: ["Competencia"],
        areas: ["Emprendimiento"],
        levels: [],
        destinations: ["Mundial"],
        funding: "varia",
        citizenship: "ver-notas",
        citizenshipRaw: "Revisa en la convocatoria quién puede postular: muchas son solo para un país o una universidad.",
        deadline: { kind: "exacta", date: r.deadline },
        notes: r.description || undefined,
        url: r.url,
        applyUrl: r.url,
        updatedAt: new Date().toISOString().slice(0, 10),
      } satisfies Opportunity;
    });
}

interface CimpaRow {
  name: string;
  url: string;
  country: string;
  city: string;
  level: string;
  type: string;
  free: boolean;
  dates: string;
  starts: string | null;
  deadline: string;
  description: string;
}

function cimpaLevels(level: string): Level[] {
  const l = level.toLowerCase();
  if (/master or higher|master and above/.test(l)) return ["maestria", "doctorado"];
  const out: Level[] = [];
  if (/licen|bachelor|undergrad/.test(l)) out.push("pregrado");
  if (/master/.test(l)) out.push("maestria");
  if (/phd|doctor/.test(l)) out.push("doctorado");
  if (/post-?doc|researcher/.test(l)) out.push("profesional");
  return out.length ? out : ["maestria", "doctorado"];
}

/** Escuelas de investigación y fellowships de matemáticas de CIMPA (scripts/actualizar_cimpa.py, cada día). */
function readCimpa(): Opportunity[] {
  const file = path.join(RAW, "cimpa.json");
  if (!existsSync(file)) return [];
  const rows = JSON.parse(readFileSync(file, "utf8")) as CimpaRow[];
  return rows.map((r) => {
    const slug = slugify(`CIMPA ${r.name}`);
    const fellowship = /fellowship/i.test(r.type);
    const place = COUNTRY_ES[r.country] ?? r.country;
    return {
      id: `cimpa-${slug}`,
      slug,
      name: fellowship ? `${r.name} (CIMPA Fellowship)` : `Escuela CIMPA: ${r.name}`,
      sponsor: "CIMPA (Centre International de Mathématiques Pures et Appliquées)",
      source: "becas",
      sourceName: "CIMPA (cimpa.info)",
      types: [fellowship ? "Fellowship de investigación" : "Escuela de investigación"],
      areas: ["Matemáticas"],
      levels: cimpaLevels(r.level),
      destinations: [place || "Mundial"],
      funding: r.free ? "parcial" : "varia",
      amount: r.free
        ? "Inscripción gratis. CIMPA da ayudas de viaje y estadía, sobre todo a participantes de países en desarrollo; se piden al postular."
        : undefined,
      citizenship: "paises-elegibles",
      citizenshipRaw: [
        r.level ? `Nivel: ${r.level}.` : "",
        r.dates ? `Fechas: ${r.dates}${r.city ? `, ${r.city}` : ""}.` : "",
        "CIMPA prioriza a estudiantes e investigadores de países en desarrollo; se postula en applications.cimpa.info.",
      ]
        .filter(Boolean)
        .join(" "),
      deadline: { kind: "exacta", date: r.deadline },
      notes: r.description || undefined,
      url: r.url,
      applyUrl: "https://applications.cimpa.info/",
      updatedAt: new Date().toISOString().slice(0, 10),
    } satisfies Opportunity;
  });
}

/* Beca tu Futuro (becas.gob.do), written by scripts/actualizar_becastufuturo.py. */
interface BecaTuFuturoRow {
  id: number;
  name: string;
  tipo: string; // "Nacionales" | "Internacionales"
  dirigido: string; // "Todos", "Bachilleres", …
  offers: number;
  opens: string | null;
  deadline: string;
  general: string;
  academic: string;
  url: string;
}

const BTF_COUNTRIES: [RegExp, string][] = [
  [/chile/i, "Chile"],
  [/corea|koica/i, "Corea del Sur"],
  [/españa|espana/i, "España"],
  [/méxico|mexico/i, "México"],
  [/francia/i, "Francia"],
  [/jap[oó]n|jica/i, "Japón"],
  [/taiw[aá]n/i, "Taiwán"],
];

function btfLevels(r: BecaTuFuturoRow): Level[] {
  const text = `${r.name} ${r.dirigido}`;
  if (/doctor/i.test(text) && /maestr/i.test(text)) return ["maestria", "doctorado"];
  if (/maestr|posgrado|postgrado/i.test(text)) return ["maestria"];
  if (/doctor/i.test(text)) return ["doctorado"];
  if (/bachiller|grado|licenciatura|ingenier/i.test(text)) return ["pregrado"];
  if (/docente|maestros/i.test(text)) return ["docente"];
  if (/servidor|funcionari|profesional/i.test(text)) return ["profesional"];
  return ["pregrado", "maestria", "doctorado"];
}

function readBecasTuFuturo(): Opportunity[] {
  const file = path.join(RAW, "becas-tu-futuro.json");
  if (!existsSync(file)) return [];
  const { convocatorias } = JSON.parse(readFileSync(file, "utf8")) as { convocatorias: BecaTuFuturoRow[] };
  const today = new Date().toISOString().slice(0, 10);
  return convocatorias.map((r) => {
    const slug = slugify(r.name);
    const international = /internacional/i.test(r.tipo);
    const both = /nacionales e internacionales/i.test(`${r.general} ${r.name}`);
    const country = BTF_COUNTRIES.find(([re]) => re.test(r.name))?.[1];
    const destinations = country ? [country] : both ? ["República Dominicana", "Mundial"] : international ? ["Mundial"] : ["República Dominicana"];
    const opensLater = r.opens && r.opens > today;
    return {
      id: `btf-${r.id}`,
      slug,
      name: r.name,
      sponsor: "MESCyT (plataforma Beca tu Futuro)",
      source: "becas",
      sourceName: "Beca tu Futuro (becas.gob.do)",
      types: [both ? "Becas nacionales e internacionales" : international ? "Beca internacional" : "Beca nacional"],
      areas: /steam|stem/i.test(r.name) ? ["STEAM", "Ciencia y tecnología"] : /agr[oó]nom|agricult/i.test(r.name) ? ["Agricultura"] : ["Educación"],
      levels: btfLevels(r),
      destinations,
      funding: "varia",
      amount: r.offers ? `${r.offers} ${r.offers === 1 ? "oferta" : "ofertas"} de beca en la convocatoria` : undefined,
      citizenship: "solo-rd",
      citizenshipRaw: [r.dirigido ? `Dirigida a: ${r.dirigido}.` : "", r.academic].filter(Boolean).join(" "),
      deadline: { kind: "exacta", date: r.deadline },
      notes: [opensLater ? `Abre el ${r.opens}.` : "", r.general, "Se postula en becas.gob.do con tu cédula."].filter(Boolean).join(" "),
      url: r.url,
      applyUrl: r.url,
      updatedAt: today,
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
  const financiamiento = readFinanciamiento();
  const curatedUrls = new Set(financiamiento.map((o) => o.url).filter((u): u is string => Boolean(u)));
  const all = [
    ...readInternational(),
    ...readBecas(),
    ...financiamiento,
    ...readStartups(),
    ...readVoluntariado(),
    ...readEa(),
    ...readYounoodle(curatedUrls),
    ...readCimpa(),
    ...readBecasTuFuturo(),
    ...approved,
  ];
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
