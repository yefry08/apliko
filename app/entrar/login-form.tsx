"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { stackApp } from "@/lib/stack";

const ERROR_ES: Record<string, string> = {
  EMAIL_PASSWORD_MISMATCH: "Email o contraseña incorrectos.",
  USER_EMAIL_ALREADY_EXISTS: "Ya existe una cuenta con ese email. Entra en vez de crear una.",
  PASSWORD_REQUIREMENTS_NOT_MET: "La contraseña necesita al menos 8 caracteres.",
  SIGN_UP_NOT_ENABLED: "Por ahora no se pueden crear cuentas nuevas.",
  BOT_CHALLENGE_FAILED: "No pudimos verificar que eres una persona. Intenta de nuevo.",
};

const messageFor = (error: unknown) => {
  const code = (error as { errorCode?: string } | null)?.errorCode;
  return (code && ERROR_ES[code]) || "No pudimos completar el acceso. Intenta de nuevo.";
};

export function LoginForm() {
  const { configured, user, signOut } = useAuth();
  const [mode, setMode] = useState<"entrar" | "crear">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!configured) {
    return (
      <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
        Las cuentas todavía no están activadas en este sitio. Mientras tanto, tus becas se guardan en este navegador.
      </p>
    );
  }

  if (user) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
        <p>
          Entraste como <span className="font-medium">{user.email}</span>.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/mis-becas" className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
            Ir a Mis becas
          </Link>
          <button type="button" onClick={signOut} className="rounded-full border px-5 py-2.5 text-sm hover:border-coral hover:text-coral">
            Salir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {(["google", "github"] as const).map((provider) => (
          <button
            key={provider}
            type="button"
            onClick={() => stackApp?.signInWithOAuth(provider)}
            className="h-11 rounded-full border text-sm font-medium hover:border-larimar hover:text-larimar"
          >
            Continuar con {provider === "google" ? "Google" : "GitHub"}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />o con tu email<span className="h-px flex-1 bg-border" />
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!stackApp) return;
          setBusy(true);
          setError("");
          const result =
            mode === "entrar"
              ? await stackApp.signInWithCredential({ email, password })
              : await stackApp.signUpWithCredential({ email, password, noVerificationCallback: true });
          setBusy(false);
          if (result.status === "error") setError(messageFor(result.error));
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
            className="h-11 rounded-lg border bg-card px-3 outline-none placeholder:text-muted-foreground focus-visible:border-larimar focus-visible:ring-2 focus-visible:ring-larimar/30"
          />
        </label>
        <label htmlFor="password" className="flex flex-col gap-1.5">
          <span className="eyebrow">Contraseña</span>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "entrar" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-lg border bg-card px-3 outline-none focus-visible:border-larimar focus-visible:ring-2 focus-visible:ring-larimar/30"
          />
        </label>
        {error && <p className="text-sm text-coral">{error}</p>}
        <button type="submit" disabled={busy} className="h-11 rounded-full bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60">
          {busy ? "Un momento…" : mode === "entrar" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "entrar" ? "crear" : "entrar");
          setError("");
        }}
        className="self-start text-sm text-larimar hover:underline"
      >
        {mode === "entrar" ? "No tengo cuenta, quiero crear una" : "Ya tengo cuenta, quiero entrar"}
      </button>
    </div>
  );
}
