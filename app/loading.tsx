import { DiceLoader } from "@/components/dice-loader";

/** Shown while a page that renders on the server (catalog, profile…) is on its way. */
export default function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <DiceLoader size={150} label="Buscando oportunidades…" />
    </div>
  );
}
