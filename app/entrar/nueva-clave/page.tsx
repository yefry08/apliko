"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { stackApp } from "@/lib/stack";
import { inputClass, messageFor } from "../login-form";

/** Llega desde el correo de recuperación con ?code=… y guarda la contraseña nueva. */
export default function NuevaClavePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-20 sm:px-6">
        <div className="flex flex-col gap-3">
          <p className="eyebrow">Tu cuenta</p>
          <h1 className="font-display text-5xl tracking-tight">Nueva contraseña</h1>
        </div>
        <Suspense fallback={null}>
          <NewPasswordForm />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

function NewPasswordForm() {
  const code = useSearchParams().get("code");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!code) {
    return (
      <p className="text-muted-foreground">
        Este enlace está incompleto.{" "}
        <Link href="/entrar/recuperar" className="text-larimar hover:underline">
          Pide uno nuevo
        </Link>
        .
      </p>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5" aria-live="polite">
        <p>Listo, ya puedes entrar con tu contraseña nueva.</p>
        <Link href="/entrar" className="self-start rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!stackApp) return;
        setBusy(true);
        setError("");
        const result = await stackApp.resetPassword({ code, password });
        setBusy(false);
        if (result.status === "error") setError(messageFor(result.error));
        else setDone(true);
      }}
    >
      <label htmlFor="password" className="flex flex-col gap-1.5">
        <span className="eyebrow">Contraseña nueva</span>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <span className="text-xs text-muted-foreground">Al menos 8 caracteres.</span>
      </label>
      {error && <p className="text-sm text-coral">{error}</p>}
      <button type="submit" disabled={busy} className="h-11 rounded-full bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60">
        {busy ? "Un momento…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
