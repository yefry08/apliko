"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useApliko } from "@/lib/store";
import { cn } from "@/lib/utils";

export function SaveButton({ id, name, variant = "icon", className }: { id: string; name: string; variant?: "icon" | "pill"; className?: string }) {
  const { isSaved, toggleSaved } = useApliko();
  const saved = isSaved(id);
  const Icon = saved ? BookmarkCheck : Bookmark;

  if (variant === "pill") {
    return (
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => toggleSaved(id)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm transition-colors",
          saved ? "border-larimar bg-larimar/10 text-larimar" : "hover:border-larimar hover:text-larimar",
          className,
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
        {saved ? "Guardada en Mis becas" : "Guardar"}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Quitar ${name} de Mis becas` : `Guardar ${name} en Mis becas`}
      onClick={() => toggleSaved(id)}
      className={cn(
        "relative z-10 flex size-8 items-center justify-center rounded-full transition-colors",
        saved ? "text-larimar" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        className,
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

export function SavedCount() {
  const { state } = useApliko();
  const n = Object.keys(state.items).length;
  if (!n) return null;
  return (
    <span className="ml-1.5 rounded-full bg-larimar px-1.5 font-mono text-[10px] tabular-nums text-background" aria-label={`${n} guardadas`}>
      {n}
    </span>
  );
}
