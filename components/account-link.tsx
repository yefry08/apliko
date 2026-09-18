"use client";

import Link from "next/link";
import { useAuth } from "./auth-provider";

export function AccountLink() {
  const { configured, user, loading } = useAuth();
  if (!configured || loading) return null;
  if (!user) {
    return (
      <Link href="/entrar" className="rounded-full border px-3 py-1 text-foreground hover:border-larimar hover:text-larimar">
        Entrar
      </Link>
    );
  }
  const initial = (user.email ?? "?").charAt(0).toUpperCase();
  return (
    <Link
      href="/entrar"
      aria-label={`Tu cuenta: ${user.email}`}
      className="flex size-7 items-center justify-center rounded-full bg-larimar font-mono text-xs text-background"
    >
      {initial}
    </Link>
  );
}

export function SyncNote() {
  const { configured, user, sync } = useAuth();
  if (!configured) return null;
  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link href="/entrar" className="text-larimar hover:underline">
          Entra a tu cuenta
        </Link>{" "}
        para verlas en cualquier dispositivo.
      </p>
    );
  }
  const text = {
    idle: "",
    syncing: "Sincronizando…",
    synced: `Sincronizado con ${user.email}`,
    error: "No pudimos sincronizar. Tus cambios siguen en este navegador y se reintentan con el próximo cambio.",
  }[sync];
  return <p className={sync === "error" ? "text-sm text-coral" : "text-sm text-muted-foreground"}>{text}</p>;
}
