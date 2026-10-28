import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ADVISORS } from "@/lib/asesores";
import { LEAD_HOURS, WINDOW_DAYS } from "@/lib/asesorias";
import { SESSION } from "@/lib/equipo";
import { Booker } from "./booker";

export const metadata: Metadata = {
  title: "Asesorías 1-1",
  description: `Reserva una asesoría de ${SESSION.minutes} minutos con el equipo de ApliKo por USD ${SESSION.priceUsd}: revisamos tu beca, tu ensayo o tu estrategia.`,
};

const STEPS = [
  { title: "Reserva", text: "Elige con quién y a qué hora. El horario queda apartado 48 horas." },
  { title: "Paga por Payoneer", text: `Te llega a tu correo una solicitud de pago de USD ${SESSION.priceUsd}. Se paga con tarjeta o banco.` },
  { title: "Conéctate", text: "Con el pago confirmado te enviamos el enlace de Google Meet y un recordatorio el día antes." },
];

export default function AsesoriasPage() {
  // Only public fields go to the browser; each advisor's email stays on the server.
  const advisors = ADVISORS.map(({ slug, name, role, photo, initials }) => ({ slug, name, role, photo, initials }));
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6">
        <div className="flex max-w-3xl flex-col gap-3">
          <p className="eyebrow">Asesorías 1-1</p>
          <h1 className="font-display text-5xl tracking-tight md:text-6xl">Habla con el equipo</h1>
          <p className="text-muted-foreground">
            {SESSION.minutes} minutos por videollamada para revisar una beca, tu ensayo, tu CV o tu estrategia de
            postulación. <span className="font-medium text-foreground">USD {SESSION.priceUsd}</span> por sesión.
          </p>
        </div>
        <ol className="grid gap-4 md:grid-cols-3" role="list">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border p-5">
              <p className="font-mono text-xs text-larimar">0{i + 1}</p>
              <p className="mt-2 font-medium">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
        <Booker advisors={advisors} leadHours={LEAD_HOURS} windowDays={WINDOW_DAYS} />
      </main>
      <SiteFooter />
    </>
  );
}
