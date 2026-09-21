"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { stackApp } from "@/lib/stack";

/** Landing after Google or GitHub send the person back. */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!stackApp) return;
    stackApp
      .callOAuthCallback()
      .then((ok) => {
        if (!ok) setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [router]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-24 text-center sm:px-6">
      {failed ? (
        <>
          <h1 className="font-display text-3xl">No pudimos completar el acceso</h1>
          <p className="text-muted-foreground">El enlace venció o se abrió en otro navegador.</p>
          <a href="/entrar" className="mx-auto rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
            Volver a intentar
          </a>
        </>
      ) : (
        <p className="text-muted-foreground" aria-live="polite">
          Entrando…
        </p>
      )}
    </main>
  );
}
