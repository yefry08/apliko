/** Áreas del catálogo: las teclas y carpetas de la portada y el filtro "Área" del catálogo. Sin datos: sirve en el cliente. */
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
  /** Text colour on the folder and key; navy unless the folder is dark. */
  ink?: string;
  cardColor: string;
  numberColor: string;
  /** Team member who represents the area (slug in lib/equipo.ts). */
  rep?: string;
  matches: (o: Opportunity) => boolean;
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const haystack = (o: Opportunity) => fold([o.name, ...o.areas, ...o.types].join(" | "));
const has = (pattern: RegExp) => (o: Opportunity) => pattern.test(haystack(o));

/**
 * For the narrow divisions (IA, software, datos…). The May 2026 international list tags many general programs
 * with broad fields like "IA y ciencia de datos", so for that source only the name and type count; the other
 * sources tag areas by hand or per program.
 */
const focused = (pattern: RegExp) => (o: Opportunity) =>
  pattern.test(fold((o.source === "internacional" ? [o.name, ...o.types] : [o.name, ...o.areas, ...o.types]).join(" | ")));

/**
 * Order matters: the first eight are the keys of the "ApliKo" keyboard (six letters, enter, side key) and the
 * rest go on its function row. An opportunity can sit in several areas.
 */
export const AREAS: Area[] = [
  {
    id: "ia",
    number: "01",
    title: "Inteligencia artificial",
    tab: "01 / IA",
    folderName: ["Inteligencia", "artificial"],
    description: "Machine learning, IA segura y sus aplicaciones. Para quien construye o investiga IA.",
    covers: "Becas, fellowships, hackatones y programas de investigación en inteligencia artificial, machine learning y seguridad de la IA.",
    folderColor: "#6EC6FF",
    cardColor: "#EAF6FF",
    numberColor: "#1F6E9C",
    rep: "marco-reyes",
    matches: focused(/\b(ia|ai|inteligencia artificial|artificial intelligence|machine learning|aprendizaje automatico|deep learning|llms?|ai safety|seguridad de la ia|alignment|nlp|procesamiento de lenguaje natural|vision por computador\w*|computer vision|agentes)\b/),
  },
  {
    id: "software",
    number: "02",
    title: "Software",
    tab: "02 / SOFTWARE",
    folderName: ["Software", "y código"],
    description: "Programación, hackatones y ciberseguridad. Del primer repo al producto.",
    covers: "Hackatones, pasantías, becas y programas de desarrollo de software, ciencias de la computación y ciberseguridad.",
    folderColor: "#FFA94D",
    cardColor: "#FFF1E2",
    numberColor: "#A85A12",
    rep: "maria-colas",
    matches: focused(/\b(software|programacion|programming|hackat\w*|hackathon\w*|codigo|coding|computacion|computer science|ciencias de la computacion|informatica|ciberseguridad|cybersecurity|seguridad de la informacion|information security|open source|cloud)\b/),
  },
  {
    id: "datos",
    number: "03",
    title: "Datos",
    tab: "03 / DATOS",
    folderName: ["Ciencia", "de datos"],
    description: "Ciencia de datos, estadística y analítica. Preguntas que se responden con datos.",
    covers: "Programas de ciencia de datos, analítica, estadística aplicada, bioinformática y big data.",
    folderColor: "#5EEAD4",
    cardColor: "#E6FBF7",
    numberColor: "#12796A",
    rep: "yira-tavarez",
    matches: focused(/\b(datos|data|data science|ciencia de datos|analitica|analytics|estadistica aplicada|bioinformatic\w*|big data)\b/),
  },
  {
    id: "matematicas",
    number: "04",
    title: "Matemáticas",
    tab: "04 / MATEMÁTICAS",
    folderName: ["Matemáticas", "y estadística"],
    description: "Matemática pura y aplicada, estadística y olimpiadas. Rigor que abre puertas.",
    covers: "Becas, escuelas de verano, olimpiadas e investigación en matemáticas, estadística y computación científica.",
    folderColor: "#D6B98C",
    cardColor: "#F8F1E6",
    numberColor: "#8A6A33",
    rep: "jeralvi-mendoza",
    matches: focused(/\b(matematic\w*|mathemat\w*|maths?|estadistica\w*|statistics|actuari\w*|olimpiada\w*|olympiad\w*|computacion cientifica|computacion de alto rendimiento|high performance computing)\b/),
  },
  {
    id: "espacio",
    number: "05",
    title: "Espacio",
    tab: "05 / ESPACIO",
    folderName: ["Espacio", "y aeroespacial"],
    description: "Astronomía, satélites y ciencias aeroespaciales. Oportunidades fuera de este mundo.",
    covers: "Becas, pasantías y programas en ciencias espaciales, astronomía, astrofísica, ingeniería aeroespacial y ciencias atmosféricas.",
    folderColor: "#0B0B14",
    ink: "#FFFFFF",
    cardColor: "#EDEDF3",
    numberColor: "#0B0B14",
    matches: focused(/\b(espacio|espacial\w*|space|aeroespacial|aerospace|astronom\w*|astrofisic\w*|astrophysic\w*|satelit\w*|satellite\w*|nasa|planetar\w*|cohetes?|rockets?|ciencias atmosfericas|atmospheric)\b/),
  },
  {
    id: "fondos",
    number: "06",
    title: "Fondos y emprendimiento",
    tab: "06 / FONDOS",
    folderName: ["Fondos y", "emprendimiento"],
    description: "Premios, fondos, aceleradoras y competencias para proyectos, startups y organizaciones.",
    covers: "Convocatorias de financiamiento, premios, aceleradoras, incubadoras, demo days y competencias de emprendimiento.",
    folderColor: "#C8FF48",
    cardColor: "#F5FFD9",
    numberColor: "#5F7A12",
    rep: "yefry-nunez",
    matches: (o) =>
      o.source === "financiamiento" ||
      /\b(emprend\w*|startups?|entrepreneur\w*|aceleradora\w*|accelerator\w*|incubadora\w*|incubator\w*)\b/.test(haystack(o)),
  },
  {
    id: "steam",
    number: "07",
    title: "STEAM",
    tab: "07 / STEAM",
    folderName: ["STEAM", "y ciencias"],
    description: "Ciencia, tecnología, ingeniería, arte y matemáticas. De la investigación al laboratorio.",
    covers: "Becas, fellowships y premios en ciencias, ingeniería, matemáticas, datos, inteligencia artificial y tecnología.",
    folderColor: "#FF7869",
    cardColor: "#F1EDFF",
    numberColor: "#7665B5",
    matches: has(/\b(stem|steam|ciencias?|science|tecnolog\w*|technology|ingenier\w*|engineering|matematic\w*|datos|data|ia|ai|inteligencia artificial|software|astronom\w*|quimic\w*|fisica|biolog\w*|geolog\w*|semiconductor\w*|informatica|tic|fotonica|microscopia|6g)\b/),
  },
  {
    id: "salud",
    number: "08",
    title: "Salud",
    tab: "08 / SALUD",
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
    number: "09",
    title: "Clima",
    tab: "09 / CLIMA",
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
    number: "10",
    title: "Política",
    tab: "10 / POLÍTICA",
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
    number: "11",
    title: "Diplomacia",
    tab: "11 / DIPLOMACIA",
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
    number: "12",
    title: "Impacto social",
    tab: "12 / SOCIAL",
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
    number: "13",
    title: "Medios y cultura",
    tab: "13 / MEDIOS",
    folderName: ["Medios", "y cultura"],
    description: "Periodismo, artes, cine y humanidades. Historias que merecen contarse bien.",
    covers: "Periodismo, fotografía, cine, escritura, artes visuales, historia y humanidades.",
    folderColor: "#FFD6A5",
    cardColor: "#FFF3E4",
    numberColor: "#A8672A",
    matches: has(/\b(periodismo|journalism|medios|media|cine|film|fotografia|photography|artes?|arts?|cultura|culture|escritura|literatura|diseno|design|creativ\w*|audiovisual|historia|history|humanidades|humanities)\b/),
  },
];

export const AREA_BY_ID = new Map(AREAS.map((a) => [a.id, a]));
