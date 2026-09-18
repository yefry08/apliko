/**
 * Normaliza las fuentes de data/raw en data/opportunities.json.
 *   npm run data:import
 */
import ExcelJS from "exceljs";
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
        types: split(r.programType),
        areas: split(r.subjects),
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

/* ---------------- Oportunidadesinvivo (XLSX) ---------------- */

const excelDate = (serial: number) =>
  new Date(Date.UTC(1899, 11, 30) + serial * 86400000).toISOString().slice(0, 10);

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("text" in v && v.text != null) return String(v.text);
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("hyperlink" in v) return String(v.hyperlink);
    if ("result" in v) return String(v.result ?? "");
  }
  return String(v).trim();
}

function levelsFromEs(s: string): Level[] {
  const t = s.toLowerCase();
  const out = new Set<Level>();
  if (/secundaria|colegio|escolar|bachiller/.test(t)) out.add("secundaria");
  if (/pregrado|pregado|licenciatura|universitari|grado\b|bachelor/.test(t)) out.add("pregrado");
  if (/maestr|master|posgrado|postgrado/.test(t)) out.add("maestria");
  if (/doctor|phd|posgrado|postgrado|postdoc/.test(t)) out.add("doctorado");
  if (/egresad|recien|recién|graduad/.test(t)) out.add("recien-graduado");
  if (/profesional|investigador|jóvenes|jovenes|todos/.test(t)) out.add("profesional");
  if (/docente|profesor/.test(t)) out.add("docente");
  return [...out];
}

function deadlineFromEs(v: ExcelJS.CellValue): Deadline {
  if (typeof v === "number") return { kind: "exacta", date: excelDate(v) };
  if (v instanceof Date) return { kind: "exacta", date: v.toISOString().slice(0, 10) };
  const t = cellText(v);
  if (!t) return { kind: "por-confirmar" };
  if (/rolling|continu|abierta|sin deadline/i.test(t)) return { kind: "continua", label: t };
  return { kind: "por-confirmar", label: t };
}

async function readInvivo(): Promise<Opportunity[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(RAW, "invivo.xlsx"));
  const ws = wb.getWorksheet("Becas")!;
  const out: Opportunity[] = [];
  ws.eachRow((row, n) => {
    if (n <= 2) return; // "Nos mudamos" banner + header
    const c = (i: number) => row.getCell(i).value;
    const name = cellText(c(4));
    if (!name) return;
    const note = cellText(c(10));
    const audience = cellText(c(9));
    const text = `${note} ${audience}`;
    if (name === "Nombre") return; // repeated header row
    const destinations = cellText(c(7))
      .split(/[\/,]/)
      .map((d) => d.trim())
      .filter((d) => d && d !== "País")
      .map((d) => COUNTRY_ES[d] ?? d);
    out.push({
      id: `inv-${slugify(name)}`,
      slug: slugify(name),
      name,
      source: "invivo",
      types: split(cellText(c(1))),
      areas: split(cellText(c(2))),
      levels: levelsFromEs(audience),
      destinations: destinations.length ? destinations : ["Varios países"],
      funding: /cost|pago|tarifa|fee/i.test(note) ? "con-costo" : "varia",
      citizenship: /latam|latino|am[eé]rica latina|iberoam/i.test(text) ? "latam" : note ? "ver-notas" : "global",
      audience: audience || undefined,
      deadline: deadlineFromEs(c(6)),
      notes: note || undefined,
      applyUrl: cellText(c(8)) || undefined,
      url: cellText(c(8)) || undefined,
      updatedAt: "2026-07-29",
    });
  });
  return out;
}

async function main() {
  // De los feeds RSS (scripts/ingest_rss.py) solo entran las candidatas aprobadas.
  const rssFile = path.join(process.cwd(), "data", "rss", "candidates.json");
  const approved = existsSync(rssFile)
    ? (JSON.parse(readFileSync(rssFile, "utf8")) as { estado: string; oportunidad: Opportunity }[])
        .filter((c) => c.estado === "aprobada")
        .map((c) => c.oportunidad)
    : [];
  const all = [...readInternational(), ...(await readInvivo()), ...approved];
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
