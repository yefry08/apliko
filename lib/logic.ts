/** Pure helpers shared by server and client code. No data imports here. */
import type { CitizenshipRule, Funding, Level, Opportunity } from "./types";

/* ---------------- Status ---------------- */

export type Status = "abierta" | "cierra-pronto" | "continua" | "por-confirmar" | "cerrada";

const DAY = 86_400_000;

/** Today in Dominican Republic time (AST, UTC−4, no DST). */
export function todayRD(now = new Date()): string {
  return new Date(now.getTime() - 4 * 3_600_000).toISOString().slice(0, 10);
}

export function daysLeft(o: Opportunity, today = todayRD()): number | null {
  if (o.deadline.kind !== "exacta" || !o.deadline.date) return null;
  return Math.round((Date.parse(o.deadline.date) - Date.parse(today)) / DAY);
}

export function statusOf(o: Opportunity, today = todayRD()): Status {
  const d = daysLeft(o, today);
  if (d !== null) return d < 0 ? "cerrada" : d <= 30 ? "cierra-pronto" : "abierta";
  if (o.deadline.kind === "continua") return "continua";
  return "por-confirmar";
}

export const STATUS_LABEL: Record<Status, string> = {
  abierta: "Abierta",
  "cierra-pronto": "Cierra pronto",
  continua: "Continua",
  "por-confirmar": "Por confirmar",
  cerrada: "Cerrada",
};

/* ---------------- Labels ---------------- */

export const LEVEL_LABEL: Record<Level, string> = {
  secundaria: "Secundaria",
  pregrado: "Pregrado",
  maestria: "Maestría",
  doctorado: "Doctorado",
  "recien-graduado": "Recién graduado",
  profesional: "Profesional",
  docente: "Docente",
};

export const FUNDING_LABEL: Record<Funding, string> = {
  completa: "Totalmente financiada",
  alta: "Muy financiada",
  parcial: "Parcial",
  estipendio: "Con estipendio",
  "segun-necesidad": "Según necesidad",
  "con-costo": "Tiene costo",
  varia: "Varía",
};

/* ---------------- Eligibility ---------------- */

export type Profile = "rd" | "latam" | "eeuu-ciudadano" | "eeuu-residente" | "daca";

export const PROFILE_LABEL: Record<Profile, string> = {
  rd: "Vivo en RD (ciudadanía dominicana)",
  latam: "Vivo en otro país de Latinoamérica",
  "eeuu-ciudadano": "Soy ciudadano de EE.UU.",
  "eeuu-residente": "Soy residente permanente de EE.UU.",
  daca: "Tengo DACA",
};

export type Eligibility = "elegible" | "revisar" | "no-elegible";

const RULES: Record<CitizenshipRule, Record<Profile, Eligibility>> = {
  "solo-eeuu": { rd: "no-elegible", latam: "no-elegible", "eeuu-ciudadano": "elegible", "eeuu-residente": "no-elegible", daca: "no-elegible" },
  "eeuu-residente": { rd: "no-elegible", latam: "no-elegible", "eeuu-ciudadano": "elegible", "eeuu-residente": "elegible", daca: "no-elegible" },
  "eeuu-daca": { rd: "no-elegible", latam: "no-elegible", "eeuu-ciudadano": "elegible", "eeuu-residente": "elegible", daca: "elegible" },
  "no-eeuu": { rd: "elegible", latam: "elegible", "eeuu-ciudadano": "no-elegible", "eeuu-residente": "revisar", daca: "revisar" },
  global: { rd: "elegible", latam: "elegible", "eeuu-ciudadano": "elegible", "eeuu-residente": "elegible", daca: "revisar" },
  latam: { rd: "elegible", latam: "elegible", "eeuu-ciudadano": "revisar", "eeuu-residente": "revisar", daca: "revisar" },
  "solo-rd": { rd: "elegible", latam: "no-elegible", "eeuu-ciudadano": "revisar", "eeuu-residente": "revisar", daca: "revisar" },
  "paises-elegibles": { rd: "revisar", latam: "revisar", "eeuu-ciudadano": "revisar", "eeuu-residente": "revisar", daca: "revisar" },
  "ver-notas": { rd: "revisar", latam: "revisar", "eeuu-ciudadano": "revisar", "eeuu-residente": "revisar", daca: "revisar" },
};

export function eligibilityFor(o: Opportunity, profile: Profile): Eligibility {
  return RULES[o.citizenship][profile];
}

export const ELIGIBILITY_REASON: Record<CitizenshipRule, string> = {
  "solo-eeuu": "Solo para ciudadanos o nacionales de EE.UU.",
  "eeuu-residente": "Para ciudadanos o residentes permanentes de EE.UU.",
  "eeuu-daca": "Para ciudadanos, residentes permanentes de EE.UU. o personas con DACA.",
  "no-eeuu": "Para personas que no son ciudadanas de EE.UU.",
  global: "Abierta a todas las nacionalidades (revisa las notas por edad o área).",
  latam: "Dirigida a Latinoamérica.",
  "solo-rd": "Solo para dominicanos. Si vives fuera de RD, lee las notas: algunas aceptan a la diáspora y otras piden residir en el país.",
  "paises-elegibles": "Tiene una lista de países elegibles: confírmala en el sitio oficial.",
  "ver-notas": "Abierta internacionalmente, pero con condiciones: lee las notas.",
};

/* ---------------- Queries ---------------- */

const STATUS_ORDER: Record<Status, number> = {
  "cierra-pronto": 0,
  abierta: 1,
  continua: 2,
  "por-confirmar": 3,
  cerrada: 4,
};

export function sortForDisplay(list: Opportunity[], today = todayRD()) {
  return [...list].sort((a, b) => {
    const s = STATUS_ORDER[statusOf(a, today)] - STATUS_ORDER[statusOf(b, today)];
    if (s) return s;
    return (a.deadline.date ?? "9999").localeCompare(b.deadline.date ?? "9999");
  });
}

