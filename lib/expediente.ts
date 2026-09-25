/**
 * El perfil maestro para postular: los datos que piden casi todos los formularios, escritos
 * una sola vez. Lo usan la página Mi perfil, la sincronización y /api/sync. Sin datos del
 * catálogo, así que sirve igual en el cliente y en el servidor.
 *
 * No guarda números de pasaporte ni de cédula: esos se escriben a mano en cada formulario.
 */
import type { Level } from "./types";

export interface Personal {
  givenName: string;
  familyName: string;
  preferredName: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: string;
  nationality: string;
  residenceCountry: string;
  city: string;
  address: string;
  postalCode: string;
  linkedin: string;
  github: string;
  website: string;
}

export type LanguageLevel = "" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "nativo";
export type ExperienceKind = "" | "trabajo" | "investigacion" | "voluntariado" | "liderazgo" | "proyecto";
export type AnswerTag = "presentacion" | "metas" | "liderazgo" | "retos" | "impacto" | "por-que" | "comunidad" | "investigacion" | "otro";

export interface Language {
  id: string;
  language: string;
  level: LanguageLevel;
  test: string;
  score: string;
}

export interface Education {
  id: string;
  institution: string;
  country: string;
  degree: string;
  field: string;
  level: Level | "";
  start: string;
  end: string;
  gpa: string;
  gpaScale: string;
}

export interface Experience {
  id: string;
  organization: string;
  role: string;
  kind: ExperienceKind;
  start: string;
  end: string;
  description: string;
}

export interface Award {
  id: string;
  name: string;
  issuer: string;
  year: string;
  description: string;
}

export interface DocumentLink {
  id: string;
  name: string;
  url: string;
  updated: string;
}

export interface Answer {
  id: string;
  title: string;
  tags: AnswerTag[];
  language: "es" | "en";
  text: string;
}

export interface Expediente {
  personal: Personal;
  languages: Language[];
  education: Education[];
  experience: Experience[];
  awards: Award[];
  documents: DocumentLink[];
  answers: Answer[];
}

/** Datos personales, en el orden del formulario. `autoComplete` es el token HTML estándar. */
export const PERSONAL_FIELDS: { key: keyof Personal; label: string; autoComplete: string; type?: string }[] = [
  { key: "givenName", label: "Nombre(s)", autoComplete: "given-name" },
  { key: "familyName", label: "Apellidos", autoComplete: "family-name" },
  { key: "preferredName", label: "Cómo prefieres que te llamen", autoComplete: "nickname" },
  { key: "email", label: "Email", autoComplete: "email", type: "email" },
  { key: "phone", label: "Teléfono (con código de país)", autoComplete: "tel", type: "tel" },
  { key: "birthDate", label: "Fecha de nacimiento", autoComplete: "bday", type: "date" },
  { key: "gender", label: "Género", autoComplete: "sex" },
  { key: "nationality", label: "Nacionalidad(es)", autoComplete: "off" },
  { key: "residenceCountry", label: "País de residencia", autoComplete: "country-name" },
  { key: "city", label: "Ciudad", autoComplete: "address-level2" },
  { key: "address", label: "Dirección", autoComplete: "street-address" },
  { key: "postalCode", label: "Código postal", autoComplete: "postal-code" },
  { key: "linkedin", label: "LinkedIn", autoComplete: "url", type: "url" },
  { key: "github", label: "GitHub", autoComplete: "url", type: "url" },
  { key: "website", label: "Web o portafolio", autoComplete: "url", type: "url" },
];

export const LANGUAGE_LEVELS: Exclude<LanguageLevel, "">[] = ["A1", "A2", "B1", "B2", "C1", "C2", "nativo"];

export const EXPERIENCE_KIND_LABEL: Record<Exclude<ExperienceKind, "">, string> = {
  trabajo: "Trabajo",
  investigacion: "Investigación",
  voluntariado: "Voluntariado",
  liderazgo: "Liderazgo",
  proyecto: "Proyecto propio",
};

/** Temas de las preguntas que más se repiten en becas y fellowships. */
export const ANSWER_TAG_LABEL: Record<AnswerTag, string> = {
  presentacion: "Preséntate",
  metas: "Metas profesionales",
  liderazgo: "Liderazgo",
  retos: "Un reto que superaste",
  impacto: "Impacto en tu comunidad",
  "por-que": "Por qué este programa",
  comunidad: "Diversidad y comunidad",
  investigacion: "Propuesta de investigación",
  otro: "Otro",
};

const EMPTY_PERSONAL = Object.fromEntries(PERSONAL_FIELDS.map((f) => [f.key, ""])) as unknown as Personal;

export const EMPTY_EXPEDIENTE: Expediente = {
  personal: EMPTY_PERSONAL,
  languages: [],
  education: [],
  experience: [],
  awards: [],
  documents: [],
  answers: [],
};

export const newId = () => crypto.randomUUID();

export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/* ---------------- Validation: the one gate for localStorage, imports and the server ---------------- */

const LEVELS = new Set<string>(["secundaria", "pregrado", "maestria", "doctorado", "recien-graduado", "profesional", "docente"]);
const TAGS = new Set(Object.keys(ANSWER_TAG_LABEL));

type Row = Record<string, unknown>;
const isRow = (v: unknown): v is Row => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 300) => (typeof v === "string" ? v.slice(0, max) : "");
const oneOf = <T extends string>(v: unknown, allowed: readonly T[] | Set<string>, fallback: T): T =>
  typeof v === "string" && (allowed instanceof Set ? allowed.has(v) : allowed.includes(v as T)) ? (v as T) : fallback;
const list = <T>(v: unknown, max: number, item: (r: Row) => T): T[] => (Array.isArray(v) ? v.filter(isRow).slice(0, max).map(item) : []);
const id = (r: Row) => str(r.id, 64) || newId();

/** Coerces anything (old versions, an imported file, a request body) into a valid Expediente. */
export function parseExpediente(raw: unknown): Expediente {
  const r = isRow(raw) ? raw : {};
  const p = isRow(r.personal) ? r.personal : {};
  return {
    personal: Object.fromEntries(PERSONAL_FIELDS.map((f) => [f.key, str(p[f.key])])) as unknown as Personal,
    languages: list(r.languages, 20, (l) => ({
      id: id(l),
      language: str(l.language, 60),
      level: oneOf<LanguageLevel>(l.level, LANGUAGE_LEVELS, ""),
      test: str(l.test, 60),
      score: str(l.score, 30),
    })),
    education: list(r.education, 20, (e) => ({
      id: id(e),
      institution: str(e.institution),
      country: str(e.country, 80),
      degree: str(e.degree),
      field: str(e.field),
      level: oneOf<Level | "">(e.level, LEVELS, ""),
      start: str(e.start, 10),
      end: str(e.end, 10),
      gpa: str(e.gpa, 20),
      gpaScale: str(e.gpaScale, 20),
    })),
    experience: list(r.experience, 40, (e) => ({
      id: id(e),
      organization: str(e.organization),
      role: str(e.role),
      kind: oneOf<ExperienceKind>(e.kind, Object.keys(EXPERIENCE_KIND_LABEL) as ExperienceKind[], ""),
      start: str(e.start, 10),
      end: str(e.end, 10),
      description: str(e.description, 3000),
    })),
    awards: list(r.awards, 40, (a) => ({
      id: id(a),
      name: str(a.name),
      issuer: str(a.issuer),
      year: str(a.year, 10),
      description: str(a.description, 2000),
    })),
    documents: list(r.documents, 30, (d) => ({
      id: id(d),
      name: str(d.name, 120),
      url: str(d.url, 1000),
      updated: str(d.updated, 10),
    })),
    answers: list(r.answers, 60, (a) => ({
      id: id(a),
      title: str(a.title, 300),
      tags: Array.isArray(a.tags) ? [...new Set(a.tags.filter((t): t is AnswerTag => typeof t === "string" && TAGS.has(t)))] : [],
      language: a.language === "en" ? "en" : "es",
      text: str(a.text, 20000),
    })),
  };
}

/** What a typical application asks for, and whether the profile already has it. */
export function completeness(e: Expediente) {
  const p = e.personal;
  const checks: [string, boolean][] = [
    ["Nombre y apellidos", Boolean(p.givenName && p.familyName)],
    ["Email y teléfono", Boolean(p.email && p.phone)],
    ["Fecha de nacimiento", Boolean(p.birthDate)],
    ["Nacionalidad y residencia", Boolean(p.nationality && p.residenceCountry)],
    ["Al menos un estudio", e.education.some((x) => x.institution)],
    ["Al menos un idioma", e.languages.some((x) => x.language)],
    ["Al menos una experiencia", e.experience.some((x) => x.organization)],
    ["Tu CV", e.documents.some((d) => d.url && /cv|curr[ií]cul|resume|r[ée]sum[ée]/i.test(d.name))],
    ["Al menos una respuesta", e.answers.some((a) => wordCount(a.text) > 0)],
  ];
  const done = checks.filter(([, ok]) => ok).length;
  return { done, total: checks.length, percent: Math.round((done / checks.length) * 100), missing: checks.filter(([, ok]) => !ok).map(([label]) => label) };
}
