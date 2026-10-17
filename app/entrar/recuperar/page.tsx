"use client";

import Link from "next/link";
import { useState } from "react";
import { passesTurnstile, Turnstile } from "@/components/turnstile";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { stackApp } from "@/lib/stack";
import { inputClass, messageFor, NOT_A_ROBOT } from "../login-form";

/** Pide el correo para cambiar la contraseña. El enlace lleva a /entrar/nueva-clave. */
export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-20 sm:px-6">
        <div className="flex flex-col gap-3">
          <p className="eyebrow">Tu cuenta</p>
          <h1 className="font-display text-5xl tracking-tight">Recupera tu contraseña</h1>
          <p className="text-muted-foreground">Te enviamos un enlace para elegir una nueva.</p>
        </div>
        {sent ? (
          <p className="rounded-2xl border bg-card p-5" aria-live="polite">
            Listo. Si <span className="font-medium">{email}</span> tiene cuenta, te llega el enlace en unos minutos. Revisa
            también la carpeta de spam.
          </p>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!stackApp) return;
              setBusy(true);
              setError("");
              if (!(await passesTurnstile(token))) {
                setBusy(false);
                setError(NOT_A_ROBOT);
                setResetKey((k) => k + 1);
                return;
              }
              const result = await stackApp.sendForgotPasswordEmail(email, {
                callbackUrl: `${window.location.origin}/entrar/nueva-clave`,
              });
              setBusy(false);
              setResetKey((k) => k + 1);
              // Saying "no account with that email" would reveal who has an account.
              if (result.status === "error" && (result.error as { errorCode?: string }).errorCode !== "USER_NOT_FOUND") {
                setError(messageFor(result.error));
              } else {
                setSent(true);
              }
            }}
          >
            <label htmlFor="email" className="flex flex-col gap-1.5">
              <span className="eyebrow">Email</span>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className={inputClass}
              />
            </label>
            <Turnstile onToken={setToken} resetKey={resetKey} />
            {error && <p className="text-sm text-coral">{error}</p>}
            <button type="submit" disabled={busy} className="h-11 rounded-full bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60">
              {busy ? "Un momento…" : "Enviar enlace"}
            </button>
          </form>
        )}
        <Link href="/entrar" className="self-start text-sm text-larimar hover:underline">
          Volver a Entrar
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
