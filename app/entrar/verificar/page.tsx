"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { stackApp } from "@/lib/stack";
import { messageFor } from "../login-form";

/** Llega desde el correo de verificación con ?code=… y confirma el email de la cuenta. */
export default function VerificarPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-24 text-center sm:px-6" aria-live="polite">
        <Suspense fallback={<Working />}>
          <Verify />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

const Working = () => <p className="text-muted-foreground">Verificando tu email…</p>;

function Verify() {
  const code = useSearchParams().get("code");
  const [result, setResult] = useState<{ ok: true } | { ok: false; message: string } | null>(null);
  // A code works once; React may run this effect twice in development.
  const started = useRef(false);

  useEffect(() => {
    if (!stackApp || !code || started.current) return;
    started.current = true;
    stackApp
      .verifyEmail(code)
      .then((r) => setResult(r.status === "ok" ? { ok: true } : { ok: false, message: messageFor(r.error) }))
      .catch(() => setResult({ ok: false, message: messageFor(null) }));
  }, [code]);

  if (!code) return <Failed message="Este enlace está incompleto." />;
  if (!result) return <Working />;
  if (!result.ok) return <Failed message={result.message} />;
  return (
    <>
      <h1 className="font-display text-4xl">Email verificado</h1>
      <p className="text-muted-foreground">Tu cuenta está lista.</p>
      <Link href="/mis-becas" className="mx-auto rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
        Ir a Mis becas
      </Link>
    </>
  );
}

function Failed({ message }: { message: string }) {
  return (
    <>
      <h1 className="font-display text-4xl">No pudimos verificar tu email</h1>
      <p className="text-muted-foreground">{message}</p>
      <Link href="/entrar" className="mx-auto rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
        Entrar y pedir otro
      </Link>
    </>
  );
}
