"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { passesTurnstile, Turnstile } from "@/components/turnstile";
import { stackApp } from "@/lib/stack";

export const ERROR_ES: Record<string, string> = {
  EMAIL_PASSWORD_MISMATCH: "Email o contraseña incorrectos.",
  USER_EMAIL_ALREADY_EXISTS: "Ya existe una cuenta con ese email. Entra en vez de crear una.",
  PASSWORD_REQUIREMENTS_NOT_MET: "La contraseña necesita al menos 8 caracteres.",
  PASSWORD_TOO_SHORT: "La contraseña necesita al menos 8 caracteres.",
  USER_DOES_NOT_HAVE_PASSWORD: "Esa cuenta entra con Google o GitHub, no con contraseña.",
  SIGN_UP_REJECTED: "No pudimos crear la cuenta. Intenta con otro email o con Google.",
  PASSWORD_AUTHENTICATION_NOT_ENABLED: "El acceso con email todavía no está activado. Usa Google o GitHub.",
  SIGN_UP_NOT_ENABLED: "Por ahora no se pueden crear cuentas nuevas.",
  BOT_CHALLENGE_FAILED: "No pudimos verificar que eres una persona. Intenta de nuevo.",
  USER_NOT_FOUND: "No hay una cuenta con ese email.",
  VERIFICATION_CODE_EXPIRED: "El enlace venció. Pide uno nuevo.",
  VERIFICATION_CODE_ALREADY_USED: "Ese enlace ya se usó. Pide uno nuevo si lo necesitas.",
  VERIFICATION_CODE_NOT_FOUND: "El enlace no es válido. Pide uno nuevo.",
  VERIFICATION_CODE_MAX_ATTEMPTS_REACHED: "Demasiados intentos con ese enlace. Pide uno nuevo.",
  REDIRECT_URL_NOT_WHITELISTED: "Este dominio no está autorizado para enviar el enlace.",
};

export const messageFor = (error: unknown) => {
  const code = (error as { errorCode?: string } | null)?.errorCode;
  return (code && ERROR_ES[code]) || "No pudimos completar el acceso. Intenta de nuevo.";
};

export const NOT_A_ROBOT = "Confirma que no eres un robot y vuelve a intentar.";

export const inputClass =
  "h-11 rounded-lg border bg-card px-3 outline-none placeholder:text-muted-foreground focus-visible:border-larimar focus-visible:ring-2 focus-visible:ring-larimar/30";

export function LoginForm({ mode }: { mode: "entrar" | "crear" }) {
  const { configured, user, signOut, role } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [resent, setResent] = useState(false);

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
        {!user.verified && (
          <p className="text-sm text-muted-foreground">
            Te enviamos un correo para verificar tu email. Ábrelo y toca el enlace.{" "}
            <button
              type="button"
              disabled={resent}
              onClick={async () => {
                await user.sendVerificationEmail().catch(() => {});
                setResent(true);
              }}
              className="text-larimar hover:underline disabled:text-muted-foreground disabled:no-underline"
            >
              {resent ? "Reenviado" : "Reenviar"}
            </button>
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {(role === "admin" || role === "superadmin") && (
            <Link href="/admin" className="rounded-full bg-larimar px-5 py-2.5 text-sm font-medium text-background">
              Panel de admin
            </Link>
          )}
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
          if (!(await passesTurnstile(token))) {
            setBusy(false);
            setError(NOT_A_ROBOT);
            setResetKey((k) => k + 1);
            return;
          }
          const result =
            mode === "entrar"
              ? await stackApp.signInWithCredential({ email, password })
              : await stackApp.signUpWithCredential({
                  email,
                  password,
                  verificationCallbackUrl: `${window.location.origin}/entrar/verificar`,
                });
          setBusy(false);
          setResetKey((k) => k + 1);
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
            className={inputClass}
          />
        </label>
        <label htmlFor="password" className="flex flex-col gap-1.5">
          <span className="flex items-baseline justify-between gap-3">
            <span className="eyebrow">Contraseña</span>
            {mode === "entrar" && (
              <Link href="/entrar/recuperar" className="text-xs text-larimar hover:underline">
                ¿La olvidaste?
              </Link>
            )}
          </span>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "entrar" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          {mode === "crear" && <span className="text-xs text-muted-foreground">Al menos 8 caracteres.</span>}
        </label>
        <Turnstile onToken={setToken} resetKey={resetKey} />
        {error && <p className="text-sm text-coral">{error}</p>}
        <button type="submit" disabled={busy} className="h-11 rounded-full bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60">
          {busy ? "Un momento…" : mode === "entrar" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

      <p className="text-sm text-muted-foreground">
        {mode === "entrar" ? "¿Primera vez en ApliKo? " : "¿Ya tienes cuenta? "}
        <Link href={mode === "entrar" ? "/registro" : "/entrar"} className="text-larimar hover:underline">
          {mode === "entrar" ? "Crea tu cuenta" : "Entra"}
        </Link>
      </p>
    </div>
  );
}
