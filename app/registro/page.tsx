import type { Metadata } from "next";
import { LoginForm } from "@/app/entrar/login-form";
import { BENEFITS } from "@/lib/registro";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Crea tu cuenta gratis en ApliKo y lleva tus becas guardadas y Mi perfil a cualquier dispositivo.",
};

export default function RegistroPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-5xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-[1fr_minmax(0,28rem)]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="eyebrow">Tu cuenta</p>
            <h1 className="font-display text-5xl tracking-tight md:text-6xl">Crea tu cuenta</h1>
            <p className="max-w-md text-muted-foreground">Un minuto, y no vuelves a perder una beca guardada.</p>
          </div>
          <ul className="flex flex-col gap-4" role="list">
            {BENEFITS.map((b) => (
              <li key={b.title} className="border-l-2 border-larimar pl-4">
                <p className="font-medium">{b.title}</p>
                <p className="text-sm text-muted-foreground">{b.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <LoginForm mode="crear" />
      </main>
      <SiteFooter />
    </>
  );
}
