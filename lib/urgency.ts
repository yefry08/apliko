/** Urgency colors for opportunities by days left, shared by the tile sphere and its legend. */
export const TONES = [
  { max: 7, bg: "#E5382E", ink: "#FFFFFF", label: "Esta semana" },
  { max: 14, bg: "#FF5C8A", ink: "#FFFFFF", label: "La próxima semana" },
  { max: 30, bg: "#FFC531", ink: "#18203A", label: "Este mes" },
  { max: 60, bg: "#22B573", ink: "#FFFFFF", label: "En 2 meses" },
  { max: 120, bg: "#3054DE", ink: "#FFFFFF", label: "En 4 meses" },
] as const;

/** Past four months the tiles alternate white and black, like the rest of the sphere's filler. */
export const LATER = [
  { bg: "#FFFFFF", ink: "#18203A", label: "Más adelante" },
  { bg: "#1B2030", ink: "#FFFFFF", label: "Más adelante" },
] as const;

export function toneOf(days: number, index = 0) {
  return TONES.find((t) => days <= t.max) ?? LATER[index % 2];
}
