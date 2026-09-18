import type { Opportunity } from "./types";

/** iCalendar (.ics) with an all-day event on each deadline and alarms 7 and 1 days before. */

const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** RFC 5545 lines must be folded at 75 octets; approximate by characters. */
const fold = (line: string) => line.match(/.{1,73}/g)?.join("\r\n ") ?? line;

const compactDate = (iso: string) => iso.replaceAll("-", "");

function nextDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function buildIcs(items: Opportunity[], siteUrl: string) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const events = items
    .filter((o) => o.deadline.kind === "exacta" && o.deadline.date)
    .flatMap((o) => {
      const date = o.deadline.date!;
      const url = `${siteUrl}/becas/${o.slug}`;
      return [
        "BEGIN:VEVENT",
        `UID:${o.id}-${date}@apliko`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${compactDate(date)}`,
        `DTEND;VALUE=DATE:${compactDate(nextDay(date))}`,
        `SUMMARY:${escape(`Cierra: ${o.name}`)}`,
        `DESCRIPTION:${escape(`${o.sponsor ? `${o.sponsor}. ` : ""}Confirma la hora exacta en el sitio oficial: puede estar en la zona horaria del organizador.\n${url}`)}`,
        `URL:${url}`,
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escape(`Faltan 7 días: ${o.name}`)}`,
        "TRIGGER:-P7D",
        "END:VALARM",
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escape(`Mañana cierra: ${o.name}`)}`,
        "TRIGGER:-P1D",
        "END:VALARM",
        "END:VEVENT",
      ];
    });

  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Apliko//Becas//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", ...events, "END:VCALENDAR"]
    .map(fold)
    .join("\r\n");
}
