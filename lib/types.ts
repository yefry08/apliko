export type Level =
  | "secundaria"
  | "pregrado"
  | "maestria"
  | "doctorado"
  | "recien-graduado"
  | "profesional"
  | "docente";

export type Funding =
  | "completa"
  | "alta"
  | "parcial"
  | "estipendio"
  | "segun-necesidad"
  | "con-costo"
  | "varia";

/** Who can apply, by citizenship. */
export type CitizenshipRule =
  | "solo-eeuu" // U.S. citizen / national only
  | "eeuu-residente" // U.S. citizen or permanent resident
  | "eeuu-daca" // U.S. citizen, resident or DACA
  | "no-eeuu" // non-U.S. citizens only
  | "global" // open to all nationalities
  | "latam" // explicitly Latin America / Iberoamerica
  | "paises-elegibles" // list of eligible countries, must check
  | "ver-notas"; // international, but the notes add conditions

export type DeadlineKind = "exacta" | "temporada" | "continua" | "por-confirmar";

export interface Deadline {
  kind: DeadlineKind;
  /** ISO date (YYYY-MM-DD) when kind === "exacta" */
  date?: string;
  /** Human label from the source, e.g. "Fall", "Depende del país" */
  label?: string;
}

export interface Opportunity {
  id: string;
  slug: string;
  name: string;
  sponsor?: string;
  source: "internacional" | "rss" | "financiamiento" | "voluntariado";
  /** Feed or list the item came from, when it is more specific than `source`. */
  sourceName?: string;
  types: string[];
  areas: string[];
  levels: Level[];
  destinations: string[];
  funding: Funding;
  /** Amount as the source states it, e.g. "Hasta USD 10,000". */
  amount?: string;
  citizenship: CitizenshipRule;
  citizenshipRaw?: string;
  audience?: string;
  gpa?: string;
  language?: string;
  recommendations?: string;
  essays?: string;
  duration?: string;
  difficulty?: string;
  deadline: Deadline;
  notes?: string;
  url?: string;
  applyUrl?: string;
  updatedAt: string;
}
