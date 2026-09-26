/**
 * Lee un CV y llena Mi perfil. Todo pasa en el navegador: el PDF se convierte en líneas con
 * PDF.js (pdfToLines) y parseCv reconoce las secciones habituales de un CV en inglés o en
 * español. Sin IA ni servidores: reglas simples que el usuario revisa y corrige después.
 */
import {
  newId,
  type Award,
  type Education,
  type Expediente,
  type Experience,
  type ExperienceKind,
  type Language,
  type LanguageLevel,
  type Personal,
} from "./expediente";
import type { Level } from "./types";

/* ---------------- PDF → lines ---------------- */

export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

const LIGATURES: Record<string, string> = { "\ufb00": "ff", "\ufb01": "fi", "\ufb02": "fl", "\ufb03": "ffi", "\ufb04": "ffl" };

/**
 * Groups positioned text into visual lines: same baseline (±2.5 pt), left to right. Pieces
 * that touch are joined without a space, so ligatures ("fi", "fl") and bold runs stay whole.
 */
export function itemsToLines(items: TextItem[]): string[] {
  const sorted = items.filter((i) => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: TextItem[][] = [];
  for (const item of sorted) {
    const row = rows.at(-1);
    if (row && Math.abs(row[0].y - item.y) < 2.5) row.push(item);
    else rows.push([item]);
  }
  return rows.map((row) => {
    row.sort((a, b) => a.x - b.x);
    let line = "";
    row.forEach((item, i) => {
      const prev = row[i - 1];
      const gap = prev ? item.x - (prev.x + prev.width) : 0;
      line += (prev && gap > 1 ? " " : "") + item.str;
    });
    return line
      .replace(/[\ufb00-\ufb04]/g, (c) => LIGATURES[c])
      .replace(/\s+([,.;:)])/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  });
}

/** Browser only: PDF.js loads on demand, so the rest of the site never downloads it. */
export async function pdfToLines(data: ArrayBuffer): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data }).promise;
  const lines: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    const items = content.items.flatMap((i) => ("str" in i ? [{ str: i.str, x: i.transform[4], y: i.transform[5], width: i.width }] : []));
    lines.push(...itemsToLines(items));
  }
  return lines;
}

/* ---------------- lines → profile ---------------- */

type Section = "header" | "summary" | "experience" | "education" | "projects" | "skills" | "courses" | "awards" | "languages" | "other";

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[:：]\s*$/, "")
    .trim();

const HEADINGS: [Section, RegExp][] = [
  ["experience", /^(work |professional |relevant )?experience$|^employment( history)?$|^experiencia( laboral| profesional)?$/],
  ["education", /^education$|^academic background$|^educacion$|^formacion( academica)?$/],
  ["projects", /^(selected |personal )?projects$|^proyectos$/],
  ["skills", /^(technical )?skills$|^habilidades$|^competencias$|^aptitudes$/],
  ["courses", /^courses$|^certifications?$|^licenses (&|and) certifications$|^cursos( y certificaciones)?$|^certificaciones$/],
  ["awards", /^awards( (&|and) (recognition|honors))?$|^honors( (&|and) awards)?$|^achievements$|^premios( y reconocimientos)?$|^reconocimientos$|^logros$/],
  ["languages", /^languages$|^idiomas$/],
  ["summary", /^(professional )?summary$|^profile$|^about( me)?$|^perfil( profesional)?$|^resumen( profesional)?$|^sobre mi$/],
];

const headingOf = (line: string): Section | null => {
  const f = fold(line);
  if (f.length > 40) return null;
  return HEADINGS.find(([, re]) => re.test(f))?.[0] ?? null;
};

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, ene: 1, enero: 1,
  feb: 2, february: 2, febrero: 2,
  mar: 3, march: 3, marzo: 3,
  apr: 4, april: 4, abr: 4, abril: 4,
  may: 5, mayo: 5,
  jun: 6, june: 6, junio: 6,
  jul: 7, july: 7, julio: 7,
  aug: 8, august: 8, ago: 8, agosto: 8,
  sep: 9, sept: 9, september: 9, septiembre: 9, set: 9, setiembre: 9,
  oct: 10, october: 10, octubre: 10,
  nov: 11, november: 11, noviembre: 11,
  dec: 12, december: 12, dic: 12, diciembre: 12,
};

const WHEN = String.raw`(?:[A-Za-zÁÉÍÓÚáéíóúñ]+\.?\s+)?\d{4}`;
const NOW = String.raw`present|presente|actualidad|actual|current|now|hoy`;
const RANGE = new RegExp(String.raw`(${WHEN})\s*(?:[–—-]|to|a|hasta)\s*(${WHEN}|${NOW})`, "i");
const YEAR = /\b(19|20)\d{2}\b/;

/** "September 2025" → "2025-09"; "2022" → "2022"; "Present" → "". */
function toDate(s: string): string {
  const t = s.trim();
  if (new RegExp(`^(${NOW})$`, "i").test(t)) return "";
  const year = t.match(/\d{4}/)?.[0] ?? "";
  const month = MONTHS[fold(t.replace(/\d{4}/, "")).replace(/\.$/, "")];
  return month ? `${year}-${String(month).padStart(2, "0")}` : year;
}

const BULLET = /^[●•▪■◦‣∙·*–-]\s*/;
const isBullet = (l: string) => BULLET.test(l);
const stripBullet = (l: string) => l.replace(BULLET, "").trim();

const titleCase = (s: string) =>
  s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase()) : s;

const LANGUAGE_ES: Record<string, string> = {
  spanish: "Español", english: "Inglés", french: "Francés", portuguese: "Portugués", german: "Alemán",
  italian: "Italiano", chinese: "Chino", mandarin: "Chino mandarín", japanese: "Japonés", korean: "Coreano", arabic: "Árabe",
};

function parseLanguages(text: string): Language[] {
  // Split on commas outside parentheses: "Spanish (Native), English (Advanced C1)".
  const parts = text.split(/,(?![^(]*\))/).map((p) => p.trim()).filter(Boolean);
  return parts.map((p) => {
    const name = p.replace(/\(.*\)/, "").replace(/[-–:].*$/, "").trim();
    const cefr = p.match(/\b([ABC][12])\b/i)?.[1]?.toUpperCase() as LanguageLevel | undefined;
    const level: LanguageLevel = cefr ?? (/native|nativo|materna/i.test(p) ? "nativo" : "");
    return { id: newId(), language: LANGUAGE_ES[fold(name)] ?? name, level, test: "", score: "" };
  });
}

function degreeLevel(degree: string): Level | "" {
  const d = fold(degree);
  if (/ph\.?d|doctor/.test(d)) return "doctorado";
  if (/master|maestr|magister|mba|\bm\.?s\.?c?\b/.test(d)) return "maestria";
  if (/associate|bachelor|licenciat|ingenier|grado|tecnolog|tecnico superior|\bb\.?(s|a|sc)\b/.test(d)) return "pregrado";
  if (/high school|bachillerato|secundaria/.test(d)) return "secundaria";
  return "";
}

function experienceKind(text: string): ExperienceKind {
  const t = fold(text);
  if (/research|investig/.test(t)) return "investigacion";
  if (/volunt/.test(t)) return "voluntariado";
  return "trabajo";
}

/** "Machine Learning Engineer at Anyone AI," → role + organization. */
function splitRole(title: string): { role: string; organization: string } {
  const t = title.replace(/[,|–—-]+\s*$/, "").trim();
  const m = t.match(/^(.*?)\s+(?:at|en|@)\s+(.*)$/i) ?? t.match(/^(.*?)\s*[,|–—]\s+(.*)$/);
  return m ? { role: m[1].trim(), organization: m[2].trim() } : { role: t, organization: "" };
}

export interface CvResult {
  personal: Partial<Personal>;
  summary: string;
  experience: Experience[];
  education: Education[];
  languages: Language[];
  awards: Award[];
  skills: string;
}

export function parseCv(lines: string[]): CvResult {
  const text = lines.join("\n");
  const out: CvResult = { personal: {}, summary: "", experience: [], education: [], languages: [], awards: [], skills: "" };

  // Contact details can sit anywhere in the header, so search the whole text once.
  const email = text.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/)?.[0];
  const phone = text.match(/\+?\d[\d\s().-]{7,}\d/)?.[0]?.trim();
  const linkedin = text.match(/linkedin\.com\/in\/[^\s)|,]+/i)?.[0];
  const github = text.match(/github\.com\/[\w-]+/i)?.[0];
  if (email) out.personal.email = email;
  if (phone) out.personal.phone = phone;
  if (linkedin) out.personal.linkedin = `https://${linkedin.replace(/\/$/, "")}`;
  if (github) out.personal.github = `https://${github}`;

  // Split into sections by heading.
  const sections: { kind: Section; lines: string[] }[] = [{ kind: "header", lines: [] }];
  for (const line of lines) {
    const h = headingOf(line);
    if (h) sections.push({ kind: h, lines: [] });
    else sections.at(-1)!.lines.push(line);
  }

  // Header: name, location and the summary paragraph.
  const header = sections[0].lines;
  const name = header.find((l) => /\p{L}/u.test(l) && !/@|\d|:/.test(l));
  if (name) {
    const words = titleCase(name).split(/\s+/);
    const given = words.length >= 4 ? 2 : 1;
    out.personal.givenName = words.slice(0, given).join(" ");
    out.personal.familyName = words.slice(given).join(" ");
  }
  const place = header.find((l) => l !== name && /^[^\d@:|]+,\s*[^\d@:|]+$/.test(l) && l.length < 60);
  if (place) {
    const [city, country] = place.split(",").map((s) => s.trim());
    out.personal.city = city;
    out.personal.residenceCountry = country;
  }
  // The summary starts at the first long line and runs to the end of the header, short last line included.
  const firstLong = header.findIndex((l) => l.length > 60 && !/@|linkedin|github/i.test(l));
  out.summary = firstLong >= 0 ? header.slice(firstLong).join(" ") : "";

  for (const s of sections.slice(1)) {
    const ls = s.lines;
    if (s.kind === "summary") out.summary = [out.summary, ls.join(" ")].filter(Boolean).join(" ");

    if (s.kind === "experience" || s.kind === "projects") {
      let current: Experience | null = null;
      for (const l of ls) {
        const range = l.match(RANGE);
        const isTech = /^(main )?technolog|^tecnolog/.test(fold(l));
        const startsEntry = !isBullet(l) && !isTech && (range || (s.kind === "projects" && l.length < 70));
        if (startsEntry) {
          const title = range ? l.slice(0, range.index).trim() : l;
          const { role, organization } = s.kind === "projects" ? { role: "", organization: title } : splitRole(title);
          current = {
            id: newId(),
            organization,
            role,
            kind: s.kind === "projects" ? "proyecto" : experienceKind(`${role} ${organization}`),
            start: range ? toDate(range[1]) : "",
            end: range ? toDate(range[2]) : "",
            description: "",
          };
          out.experience.push(current);
        } else if (current) {
          const piece = isBullet(l) ? `\n• ${stripBullet(l)}` : isTech ? `\n${l}` : ` ${l}`;
          current.description = (current.description + piece).trim();
        }
      }
    }

    if (s.kind === "education") {
      let current: Education | null = null;
      for (const l of ls) {
        const range = l.match(RANGE);
        const year = l.match(YEAR);
        if (!isBullet(l) && (range || (year && l.replace(YEAR, "").trim().length > 3))) {
          const institution = l.slice(0, (range ?? year)!.index).trim();
          current = {
            id: newId(),
            institution,
            country: "",
            degree: "",
            field: "",
            level: "",
            start: range ? toDate(range[1]) : "",
            end: range ? toDate(range[2]) : toDate(year![0]),
            gpa: l.match(/gpa[:\s]*([\d.]+)/i)?.[1] ?? "",
            gpaScale: "",
          };
          out.education.push(current);
        } else if (current && !current.degree) {
          current.degree = stripBullet(l);
          current.field = l.match(/\b(?:in|en)\s+(.+)$/i)?.[1]?.trim() ?? "";
          current.level = degreeLevel(l);
        }
      }
    }

    if (s.kind === "courses") {
      for (const l of ls.filter(isBullet)) {
        const body = stripBullet(l);
        const year = body.match(YEAR)?.[0] ?? "";
        const [degree, institution = ""] = body.replace(YEAR, "").split(/\s+[–—-]\s+/).map((x) => x.trim());
        out.education.push({ id: newId(), institution, country: "", degree, field: "", level: "", start: "", end: year, gpa: "", gpaScale: "" });
      }
    }

    if (s.kind === "awards") {
      for (const l of ls.filter(isBullet)) {
        const body = stripBullet(l);
        const year = body.match(YEAR)?.[0] ?? "";
        out.awards.push({ id: newId(), name: body.replace(/\s*\(?\b(19|20)\d{2}\b\)?\s*$/, "").trim(), issuer: "", year, description: "" });
      }
    }

    if (s.kind === "skills" || s.kind === "languages") {
      const langLine = ls.find((l) => /^(languages|idiomas)\s*:/i.test(l));
      if (s.kind === "languages") out.languages.push(...parseLanguages(ls.join(", ")));
      else if (langLine) out.languages.push(...parseLanguages(langLine.replace(/^[^:]+:/, "")));
      out.skills = [out.skills, ls.filter((l) => l !== langLine).join("\n")].filter(Boolean).join("\n").trim();
    }
  }

  return out;
}

/* ---------------- merge into the profile ---------------- */

const key = (...parts: string[]) => parts.map(fold).join("|");

/**
 * Adds what the CV has to the profile without overwriting anything the user already wrote:
 * empty personal fields get filled, and list entries are added only when new.
 */
export function mergeCv(e: Expediente, cv: CvResult, fileName: string, lines: string[]): { expediente: Expediente; added: number } {
  let added = 0;
  const personal = { ...e.personal };
  for (const [k, v] of Object.entries(cv.personal) as [keyof Personal, string][]) {
    if (v && !personal[k]) {
      personal[k] = v;
      added++;
    }
  }
  const addNew = <T>(current: T[], incoming: T[], id: (x: T) => string): T[] => {
    const seen = new Set(current.map(id));
    const fresh = incoming.filter((x) => id(x).replace(/\|/g, "") && !seen.has(id(x)));
    added += fresh.length;
    return [...current, ...fresh];
  };
  const answers =
    cv.summary && !e.answers.some((a) => a.text.trim() === cv.summary.trim())
      ? [...e.answers, { id: newId(), title: "Resumen profesional (de tu CV)", tags: ["presentacion" as const], language: "en" as const, text: cv.summary }]
      : e.answers;
  if (answers !== e.answers) added++;

  const expediente: Expediente = {
    ...e,
    personal,
    experience: addNew(e.experience, cv.experience, (x) => key(x.organization, x.role)),
    education: addNew(e.education, cv.education, (x) => key(x.institution, x.degree)),
    languages: addNew(e.languages, cv.languages, (x) => key(x.language)),
    awards: addNew(e.awards, cv.awards, (x) => key(x.name)),
    answers,
    skills: e.skills || cv.skills,
    cv: { fileName, text: lines.join("\n"), importedAt: new Date().toISOString().slice(0, 10) },
  };
  if (!e.skills && cv.skills) added++;
  // Read after building the lists above: addNew tallies as it runs.
  return { added, expediente };
}
