import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entra para ver tus becas guardadas en cualquier dispositivo.",
};

export default function EntrarPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-20 sm:px-6">
        <div className="flex flex-col gap-3">
          <p className="eyebrow">Tu cuenta</p>
          <h1 className="font-display text-5xl tracking-tight">Entrar</h1>
          <p className="text-muted-foreground">
            Entra con Google, con GitHub o con tu email. Tus becas guardadas quedan en tu cuenta y las ves igual en el celular
            que en la computadora.
          </p>
        </div>
        <LoginForm />
      </main>
      <SiteFooter />
    </>
  );
}
