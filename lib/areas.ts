/** Áreas del catálogo: las carpetas de la portada y el filtro "Área" del catálogo. Sin datos: sirve en el cliente. */
import type { Opportunity } from "./types";

export interface Area {
  id: string;
  number: string;
  /** Pill title and dialog title. */
  title: string;
  /** Short label on the folder tab. */
  tab: string;
  /** Two-line name on the folder face. */
  folderName: [string, string];
  description: string;
  /** What the dialog says the area covers. */
  covers: string;
  folderColor: string;
  cardColor: string;
  numberColor: string;
  matches: (o: Opportunity) => boolean;
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const haystack = (o: Opportunity) => fold([o.name, ...o.areas, ...o.types].join(" | "));
const has = (pattern: RegExp) => (o: Opportunity) => pattern.test(haystack(o));

export const AREAS: Area[] = [
  {
    id: "steam",
    number: "01",
    title: "STEAM",
    tab: "01 / STEAM",
    folderName: ["STEAM", "y tecnología"],
    description: "Ciencia, tecnología, ingeniería, arte y matemáticas. De la investigación al código.",
    covers: "Becas, fellowships y premios en ciencias, ingeniería, matemáticas, datos, inteligencia artificial y tecnología.",
    folderColor: "#FF7869",
    cardColor: "#F1EDFF",
    numberColor: "#7665B5",
    matches: has(/\b(stem|steam|ciencias?|science|tecnolog\w*|technology|ingenier\w*|engineering|matematic\w*|datos|data|ia|ai|inteligencia artificial|software|astronom\w*|quimic\w*|fisica|biolog\w*|geolog\w*|semiconductor\w*|informatica|tic|fotonica|microscopia|6g)\b/),
  },
  {
    id: "salud",
    number: "02",
    title: "Salud",
    tab: "02 / SALUD",
    folderName: ["Salud", "y ciencias"],
    description: "Medicina, salud pública y biomedicina. Investigación que llega a las personas.",
    covers: "Oportunidades en medicina, salud pública, salud global, investigación clínica y biomédica.",
    folderColor: "#FFF1AD",
    cardColor: "#FFF1AD",
    numberColor: "#9D7720",
    matches: has(/\b(salud|health|medic\w*|biomedic\w*|cancer|neuro\w*|microbiota|clinic\w*|hematolog\w*|toxicolog\w*|inmunolog\w*|ela)\b/),
  },
  {
    id: "clima",
    number: "03",
    title: "Clima",
    tab: "03 / CLIMA",
    folderName: ["Clima", "y ambiente"],
    description: "Medio ambiente, agua, océanos y biodiversidad. Trabajo por un planeta habitable.",
    covers: "Fondos y becas sobre cambio climático, conservación, agua, océanos, bosques, energía y sostenibilidad.",
    folderColor: "#B9D9FF",
    cardColor: "#EDF3FF",
    numberColor: "#4B76B5",
    matches: has(/\b(clima\w*|climate|ambient\w*|environment\w*|sostenib\w*|sustainab\w*|biodivers\w*|conservacion|conservation|agua|water|oceanos?|marin[ao]s?|bosques?|forest\w*|agricultura|energia|energy|ecosistemas?|coral\w*)\b/),
  },
  {
    id: "politica",
    number: "04",
    title: "Política",
    tab: "04 / POLÍTICA",
    folderName: ["Política", "y derecho"],
    description: "Políticas públicas, democracia y derecho. Ideas que se convierten en decisiones.",
    covers: "Programas sobre políticas públicas, gobernanza, democracia, derecho y participación ciudadana.",
    folderColor: "#C9B8FF",
    cardColor: "#FFE8F4",
    numberColor: "#A35D84",
    matches: has(/\b(politicas?|policy|public policy|democracia|democracy|derecho|law|gobernanza|governance|ciencia politica|participacion ciudadana)\b/),
  },
  {
    id: "diplomacia",
    number: "05",
    title: "Diplomacia",
    tab: "05 / DIPLOMACIA",
    folderName: ["Diplomacia", "e idiomas"],
    description: "Relaciones internacionales, paz e idiomas. Para quien quiere trabajar entre países.",
    covers: "Intercambios, relaciones internacionales, construcción de paz, seguridad y estudio de idiomas.",
    folderColor: "#B8F0CC",
    cardColor: "#EAFBEF",
    numberColor: "#3E8A5C",
    matches: has(/\b(diplomac\w*|relaciones internacionales|international relations|paz|peace\w*|seguridad|security|idiomas?|language\w*|estudios regionales|area studies|regional studies|intercambio\w*|exchange)\b/),
  },
  {
    id: "social",
    number: "06",
    title: "Impacto social",
    tab: "06 / SOCIAL",
    folderName: ["Impacto", "social"],
    description: "Educación, igualdad y desarrollo comunitario. Proyectos con la gente al centro.",
    covers: "Educación, igualdad de género, juventud, derechos humanos, liderazgo y desarrollo comunitario.",
    folderColor: "#FFC9E3",
    cardColor: "#FFF0F6",
    numberColor: "#B0527E",
    matches: has(/\b(social|comunitari[ao]|community|derechos humanos|human rights|igualdad|equality|genero|gender|mujer\w*|women|juventud|youth|inclusion|desarrollo|development|educacion|education|liderazgo|leadership|voluntari\w*)\b/),
  },
  {
    id: "medios",
    number: "07",
    title: "Medios y cultura",
    tab: "07 / MEDIOS",
    folderName: ["Medios", "y cultura"],
    description: "Periodismo, artes, cine y humanidades. Historias que merecen contarse bien.",
    covers: "Periodismo, fotografía, cine, escritura, artes visuales, historia y humanidades.",
    folderColor: "#FFD6A5",
    cardColor: "#FFF3E4",
    numberColor: "#A8672A",
    matches: has(/\b(periodismo|journalism|medios|media|cine|film|fotografia|photography|artes?|arts?|cultura|culture|escritura|literatura|diseno|design|creativ\w*|audiovisual|historia|history|humanidades|humanities)\b/),
  },
  {
    id: "fondos",
    number: "08",
    title: "Fondos y premios",
    tab: "08 / FONDOS",
    folderName: ["Fondos", "y premios"],
    description: "Premios, fondos de investigación y convocatorias para proyectos y organizaciones.",
    covers: "Convocatorias de financiamiento revisadas a mano: premios, fondos de investigación, residencias y aceleradoras.",
    folderColor: "#C8FF48",
    cardColor: "#F5FFD9",
    numberColor: "#5F7A12",
    matches: (o) => o.source === "financiamiento",
  },
];

export const AREA_BY_ID = new Map(AREAS.map((a) => [a.id, a]));
