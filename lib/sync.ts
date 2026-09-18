"use client";

import type { Profile } from "./logic";
import { getAplikoState, setAplikoState, subscribeApliko, type AplikoState, type Stage, type TrackedItem } from "./store";

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

interface RemoteItem {
  id: string;
  stage: Stage;
  notes: string;
  savedAt: string;
  updatedAt: string;
}

interface RemoteState {
  items: RemoteItem[];
  profile: Profile | null;
  profileUpdatedAt: string | null;
}

const newer = (a?: string | null, b?: string | null) => (a ?? "") >= (b ?? "");

function merge(local: AplikoState, remote: RemoteState): AplikoState {
  const items: Record<string, TrackedItem> = { ...local.items };
  for (const r of remote.items) {
    const mine = items[r.id];
    if (!mine || newer(r.updatedAt, mine.updatedAt)) {
      items[r.id] = { stage: r.stage, notes: r.notes, savedAt: r.savedAt, updatedAt: r.updatedAt };
    }
  }
  const useRemote = remote.profileUpdatedAt && (!local.profileUpdatedAt || newer(remote.profileUpdatedAt, local.profileUpdatedAt));
  return {
    items,
    profile: useRemote ? (remote.profile ?? undefined) : local.profile,
    profileUpdatedAt: useRemote ? (remote.profileUpdatedAt ?? undefined) : local.profileUpdatedAt,
  };
}

/**
 * Mirrors the local store to the account: merges both sides once (newest edit wins,
 * nothing is dropped), then pushes each later change. Returns a function that stops it.
 */
export function startSync(getToken: () => Promise<string | null>, onStatus: (s: SyncStatus) => void) {
  let stopped = false;
  let synced: AplikoState | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let queue = Promise.resolve();

  async function push(target: AplikoState) {
    if (!synced || stopped) return;
    const before = synced;
    const upserts = Object.entries(target.items)
      .filter(([id, t]) => before.items[id]?.updatedAt !== t.updatedAt)
      .map(([id, t]) => ({ id, ...t }));
    const deletes = Object.keys(before.items).filter((id) => !(id in target.items));
    const profileChanged = before.profileUpdatedAt !== target.profileUpdatedAt;
    if (!upserts.length && !deletes.length && !profileChanged) {
      synced = target;
      onStatus("synced");
      return;
    }

    onStatus("syncing");
    const body = {
      upserts,
      deletes,
      profile: profileChanged ? { situation: target.profile ?? null, updatedAt: target.profileUpdatedAt } : undefined,
    };
    try {
      const token = await getToken();
      if (!token) throw new Error("sin token");
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (stopped) return;
      if (!res.ok) throw new Error(String(res.status));
      synced = target; // on failure it stays put, so the next change retries these rows
      onStatus("synced");
    } catch {
      if (!stopped) onStatus("error");
    }
  }

  async function initial() {
    onStatus("syncing");
    try {
      const token = await getToken();
      if (!token) throw new Error("sin token");
      const res = await fetch("/api/sync", { headers: { Authorization: `Bearer ${token}` } });
      if (stopped) return;
      if (!res.ok) throw new Error(String(res.status));
      const remote = (await res.json()) as RemoteState;
      if (stopped) return;
      const merged = merge(getAplikoState(), remote);
      // Treat what the server already has as synced, so only the difference is pushed.
      synced = {
        items: Object.fromEntries(remote.items.map((r) => [r.id, { stage: r.stage, notes: r.notes, savedAt: r.savedAt, updatedAt: r.updatedAt }])),
        profile: remote.profile ?? undefined,
        profileUpdatedAt: remote.profileUpdatedAt ?? undefined,
      };
      setAplikoState(merged);
      await push(merged);
    } catch {
      if (!stopped) onStatus("error");
    }
  }

  queue = initial();
  const unsubscribe = subscribeApliko(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      queue = queue.then(() => push(getAplikoState()));
    }, 700);
  });

  return () => {
    stopped = true;
    clearTimeout(timer);
    unsubscribe();
  };
}
