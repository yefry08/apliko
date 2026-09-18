"use client";

import { useSyncExternalStore } from "react";
import type { Profile } from "./logic";

/**
 * Saved opportunities, application stages and the viewer's profile. Always kept in this
 * browser (localStorage); when the viewer signs in, lib/sync.ts mirrors it to Neon.
 */

export type Stage = "guardada" | "preparando" | "enviada" | "resultado";

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: "guardada", label: "Guardadas", hint: "Te interesan" },
  { id: "preparando", label: "Preparando", hint: "Ensayos, cartas, documentos" },
  { id: "enviada", label: "Enviadas", hint: "Esperando respuesta" },
  { id: "resultado", label: "Con resultado", hint: "Aceptada o no" },
];

export interface TrackedItem {
  stage: Stage;
  notes: string;
  savedAt: string;
  updatedAt: string;
}

export interface AplikoState {
  profile?: Profile;
  profileUpdatedAt?: string;
  items: Record<string, TrackedItem>;
}

const KEY = "apliko:v1";
const EMPTY: AplikoState = { items: {} };
const listeners = new Set<() => void>();

let cachedRaw: string | null | undefined;
let cached: AplikoState = EMPTY;

export function getAplikoState(): AplikoState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cached; // storage blocked (private mode, etc.)
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed = raw ? (JSON.parse(raw) as AplikoState) : EMPTY;
      const items: Record<string, TrackedItem> = {};
      for (const [id, item] of Object.entries(parsed.items ?? {})) {
        items[id] = { ...item, updatedAt: item.updatedAt ?? item.savedAt };
      }
      cached = { ...parsed, items };
    } catch {
      cached = EMPTY;
    }
  }
  return cached;
}

export function setAplikoState(next: AplikoState) {
  cached = next;
  try {
    cachedRaw = JSON.stringify(next);
    window.localStorage.setItem(KEY, cachedRaw);
  } catch {
    // Keep working in memory if storage is unavailable.
  }
  listeners.forEach((l) => l());
}

export function subscribeApliko(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const now = () => new Date().toISOString();

function patchItem(id: string, patch: Partial<TrackedItem>) {
  const current = getAplikoState();
  const item = current.items[id];
  if (!item) return;
  setAplikoState({ ...current, items: { ...current.items, [id]: { ...item, ...patch, updatedAt: now() } } });
}

export function useApliko() {
  const state = useSyncExternalStore(subscribeApliko, getAplikoState, () => EMPTY);

  return {
    state,
    isSaved: (id: string) => id in state.items,
    toggleSaved(id: string) {
      const current = getAplikoState();
      const items = { ...current.items };
      if (items[id]) delete items[id];
      else items[id] = { stage: "guardada", notes: "", savedAt: now(), updatedAt: now() };
      setAplikoState({ ...current, items });
    },
    setStage: (id: string, stage: Stage) => patchItem(id, { stage }),
    setNotes: (id: string, notes: string) => patchItem(id, { notes }),
    setProfile(profile: Profile | undefined) {
      setAplikoState({ ...getAplikoState(), profile, profileUpdatedAt: now() });
    },
  };
}
