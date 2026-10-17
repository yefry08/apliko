"use client";

import { StackProvider, useUser } from "@stackframe/stack";
import { createContext, Suspense, useContext, useEffect, useState } from "react";
import { authConfigured, stackApp } from "@/lib/stack";
import { startSync, type SyncStatus } from "@/lib/sync";

export type Role = "usuario" | "admin" | "superadmin";

interface AuthValue {
  configured: boolean;
  user: { id: string; email: string | null; verified: boolean; sendVerificationEmail: () => Promise<void> } | null;
  loading: boolean;
  sync: SyncStatus;
  /** From /api/me once signed in; null until known. */
  role: Role | null;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const OFFLINE: AuthValue = {
  configured: false,
  user: null,
  loading: false,
  sync: "idle",
  role: null,
  getToken: async () => null,
  signOut: async () => {},
};
const LOADING: AuthValue = { ...OFFLINE, configured: true, loading: true };
const AuthContext = createContext<AuthValue>(OFFLINE);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!stackApp) return <AuthContext.Provider value={OFFLINE}>{children}</AuthContext.Provider>;
  return (
    <StackProvider app={stackApp} lang="es-419">
      {/* useUser() suspends, and the root layout has no boundary of its own. The fallback
          renders the same page so the static HTML is complete before anyone signs in. */}
      <Suspense fallback={<AuthContext.Provider value={LOADING}>{children}</AuthContext.Provider>}>
        <AuthBridge>{children}</AuthBridge>
      </Suspense>
    </StackProvider>
  );
}

/** Bridges Neon Auth's user into the app's own context and drives the sync. */
function AuthBridge({ children }: { children: React.ReactNode }) {
  const stackUser = useUser();
  const [sync, setSync] = useState<SyncStatus>("idle");
  const [role, setRole] = useState<{ userId: string; role: Role } | null>(null);
  const userId = stackUser?.id;
  const getToken = async () => (stackUser ? (await stackUser.currentSession.getTokens()).accessToken : null);

  useEffect(() => {
    if (!stackUser) return;
    let active = true;
    getToken()
      .then((token) => (token ? fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } }) : null))
      .then((res) => (res?.ok ? (res.json() as Promise<{ role: Role }>) : null))
      .then((data) => {
        if (active && data) setRole({ userId: stackUser.id, role: data.role });
      })
      .catch(() => {});
    const stop = startSync(getToken, setSync);
    return () => {
      active = false;
      stop();
    };
    // Re-running on the id alone is intentional: a new token object each render must not restart the sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const value: AuthValue = {
    configured: true,
    user: stackUser
      ? {
          id: stackUser.id,
          email: stackUser.primaryEmail,
          verified: stackUser.primaryEmailVerified,
          sendVerificationEmail: async () => {
            await stackUser.sendVerificationEmail();
          },
        }
      : null,
    loading: stackUser === undefined,
    sync: userId ? sync : "idle",
    role: role && role.userId === userId ? role.role : null,
    getToken,
    signOut: async () => {
      await stackUser?.signOut();
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
export { authConfigured };
