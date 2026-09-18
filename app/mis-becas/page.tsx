import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { opportunities, sortForDisplay } from "@/lib/opportunities";
import { SyncNote } from "@/components/account-link";
import { Tracker } from "./tracker";

export const metadata: Metadata = {
  title: "Mis becas",
  description: "Las becas que guardaste, en qué etapa va cada postulación y sus fechas de cierre.",
};

export const revalidate = 3600;

export default function MisBecasPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6">
        <div className="flex max-w-3xl flex-col gap-3">
          <p className="eyebrow">Seguimiento</p>
          <h1 className="font-display text-5xl font-medium tracking-tight md:text-6xl">Mis becas</h1>
          <p className="text-muted-foreground">
            Mueve cada beca según avanzas y anota lo que te falta. Añade las fechas a tu calendario para que te avise antes
            de que cierren.
          </p>
          <SyncNote />
        </div>
        <Tracker items={sortForDisplay(opportunities)} />
      </main>
      <SiteFooter />
    </>
  );
}
