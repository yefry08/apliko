import type { Metadata } from "next";
import { SyncNote } from "@/components/account-link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Editor } from "./editor";

export const metadata: Metadata = {
  title: "Mi perfil",
  description: "Tus datos, estudios, experiencia, documentos y respuestas, escritos una vez para postular más rápido.",
};

export default function MiPerfilPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6">
        <div className="flex max-w-3xl flex-col gap-3">
          <p className="eyebrow">Postular más rápido</p>
          <h1 className="font-display text-5xl tracking-tight md:text-6xl">Mi perfil</h1>
          <p className="text-muted-foreground">
            Lo que piden casi todos los formularios, escrito una sola vez: tus datos, estudios, idiomas, experiencia,
            documentos y las respuestas que reutilizas. Se guarda solo mientras escribes.
          </p>
          <p className="text-sm text-muted-foreground">
            No guardes aquí números de pasaporte, de cédula ni contraseñas: esos se escriben a mano en cada formulario.
          </p>
          <SyncNote what="tenerlo" />
        </div>
        <Editor />
      </main>
      <SiteFooter />
    </>
  );
}
