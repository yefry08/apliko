import data from "@/data/opportunities.json";
import { eligibilityFor, sortForDisplay, statusOf, todayRD } from "./logic";
import type { Opportunity } from "./types";

export * from "./logic";

export const opportunities = data as Opportunity[];

/* ---------------- Queries ---------------- */

export function getBySlug(slug: string) {
  return opportunities.find((o) => o.slug === slug);
}

export function closingSoon(limit = 6, today = todayRD()) {
  return sortForDisplay(
    opportunities.filter((o) => ["cierra-pronto", "abierta"].includes(statusOf(o, today))),
    today,
  ).slice(0, limit);
}

export function stats(today = todayRD()) {
  const open = opportunities.filter((o) => ["abierta", "cierra-pronto", "continua"].includes(statusOf(o, today)));
  return {
    total: opportunities.length,
    open: open.length,
    fullyFunded: opportunities.filter((o) => o.funding === "completa").length,
    forRD: opportunities.filter((o) => eligibilityFor(o, "rd") === "elegible").length,
    countries: new Set(opportunities.flatMap((o) => o.destinations)).size,
  };
}

/** Destination counts of opportunities that are not closed, for the globe. */
export function destinationCounts(today = todayRD()) {
  const counts = new Map<string, number>();
  for (const o of opportunities) {
    if (statusOf(o, today) === "cerrada") continue;
    for (const d of o.destinations) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return counts;
}
