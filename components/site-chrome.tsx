import Link from "next/link";
import { AccountLink } from "./account-link";
import { SavedCount } from "./save-button";
import { LazyRubik } from "./three/lazy-scenes";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-[color-mix(in_srgb,var(--page-tint,#fff)_90%,transparent)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="font-display text-2xl leading-none tracking-tight sm:text-3xl">
          ApliKo<span className="text-larimar">.</span>
        </Link>
        <nav
          aria-label="Principal"
          className="flex items-center gap-3 whitespace-nowrap text-[13px] font-medium text-foreground sm:gap-5 sm:text-sm"
        >
          <Link href="/becas" className="hover:text-foreground">
            Becas
          </Link>
          <Link href="/becas?perfil=rd" className="hidden hover:text-foreground lg:inline">
            ¿Soy elegible?
          </Link>
          <Link href="/asesorias" className="hidden hover:text-foreground sm:inline">
            Asesorías
          </Link>
          <Link href="/mis-becas" className="inline-flex items-center hover:text-foreground">
            Mis becas
            <SavedCount />
          </Link>
          <Link href="/mi-perfil" className="hover:text-foreground">
            Mi perfil
          </Link>
          <AccountLink />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto grid max-w-7xl items-start gap-8 px-4 py-10 text-sm text-muted-foreground sm:px-6 md:grid-cols-[1fr_auto]">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="font-display text-lg text-foreground">
            ApliKo<span className="text-larimar">*</span>
          </p>
          <p>
            * Cada ficha resume información pública. Confirma siempre fechas y requisitos en el sitio oficial antes de postular:
            las fechas pueden estar en la hora del país organizador.
          </p>
          <p>
            Datos: un listado de programas internacionales actualizado en mayo de 2026 y convocatorias nuevas de feeds públicos
            revisadas cada semana.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 md:items-end">
          <LazyRubik />
          <p className="font-mono text-xs md:text-right">Hecho para estudiantes dominicanos y latinos</p>
        </div>
      </div>
    </footer>
  );
}
