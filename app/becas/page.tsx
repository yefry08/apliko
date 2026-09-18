import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { opportunities, sortForDisplay } from "@/lib/opportunities";
import { Catalog, type CatalogFilters } from "./catalog";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Becas para dominicanos y latinos",
  description:
    "Catálogo de becas, fellowships, maestrías e internships. Filtra por ciudadanía, nivel, país de destino y financiamiento.",
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function BecasPage(props: PageProps<"/becas">) {
  const sp = await props.searchParams;
  const initial: CatalogFilters = {
    q: one(sp.q),
    perfil: one(sp.perfil),
    estado: one(sp.estado) || "vigentes",
    nivel: one(sp.nivel),
    fondos: one(sp.fondos),
    destino: one(sp.destino),
    categoria: ["becas", "fondos"].includes(one(sp.categoria)) ? one(sp.categoria) : "",
    vista: one(sp.vista) === "tabla" ? "tabla" : "tarjetas",
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6">
        <div className="flex max-w-3xl flex-col gap-3">
          <p className="eyebrow">Catálogo</p>
          <h1 className="font-display text-5xl font-medium tracking-tight md:text-6xl">Becas y oportunidades</h1>
          <p className="text-muted-foreground">
            Elige tu situación para ver a cuáles puedes postular. Por defecto ocultamos las que ya cerraron, pero muchas vuelven a
            abrir cada año.
          </p>
        </div>
        <Catalog items={sortForDisplay(opportunities)} initial={initial} />
      </main>
      <SiteFooter />
    </>
  );
}
