"use client";

import { StackProvider, useUser } from "@stackframe/stack";
import { createContext, Suspense, useContext, useEffect, useState } from "react";
import { authConfigured, stackApp } from "@/lib/stack";
import { startSync, type SyncStatus } from "@/lib/sync";

interface AuthValue {
  configured: boolean;
  user: { id: string; email: string | null } | null;
  loading: boolean;
  sync: SyncStatus;
  signOut: () => Promise<void>;
}

const OFFLINE: AuthValue = { configured: false, user: null, loading: false, sync: "idle", signOut: async () => {} };
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
  const userId = stackUser?.id;

  useEffect(() => {
    if (!stackUser) return;
    return startSync(async () => (await stackUser.currentSession.getTokens()).accessToken, setSync);
    // Re-running on the id alone is intentional: a new token object each render must not restart the sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const value: AuthValue = {
    configured: true,
    user: stackUser ? { id: stackUser.id, email: stackUser.primaryEmail } : null,
    loading: stackUser === undefined,
    sync: userId ? sync : "idle",
    signOut: async () => {
      await stackUser?.signOut();
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
export { authConfigured };
