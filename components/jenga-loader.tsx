"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Loading state for the 3D scenes: a Jenga tower that builds itself block by block, pauses, and starts over.
 * Seen from the front, levels alternate between three blocks side by side and one block end-on, like a real
 * tower. No WebGL, so it shows instantly while three.js or Spline download.
 */
const LEVELS = 8;
const COLORS = ["#6EC6FF", "#FFA94D", "#5EEAD4", "#D6B98C", "#C8FF48", "#FF7869", "#C9B8FF", "#FFD6A5"];
const BLOCKS = Array.from({ length: LEVELS }, (_, level) => (level % 2 === 0 ? 3 : 1));
const TOTAL = BLOCKS.reduce((a, b) => a + b, 0);
/** Ticks spent with the finished tower before it starts again. */
const HOLD = 8;

export function JengaLoader({ size = 140, label = "Cargando…" }: { size?: number; label?: string }) {
  const reduce = useReducedMotion();
  const [placed, setPlaced] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setPlaced((n) => (n >= TOTAL + HOLD ? 0 : n + 1)), 150);
    return () => clearInterval(id);
  }, [reduce]);

  const shown = reduce ? TOTAL : placed;
  const height = size / 11;
  let index = 0;

  return (
    <div role="status" aria-label={label} className="flex flex-col items-center gap-3">
      <div className="flex flex-col-reverse gap-[3px]" style={{ width: size }}>
        {BLOCKS.map((count, level) => (
          <div key={level} className="flex gap-[3px]" style={{ height }}>
            {Array.from({ length: count }, (_, b) => {
              const i = index++;
              const visible = i < shown;
              return (
                <span
                  key={b}
                  className="flex-1 rounded-[3px] border-2 border-[#18203A] transition-[opacity,translate] duration-300 ease-out"
                  style={{
                    background: COLORS[(level + b) % COLORS.length],
                    opacity: visible ? 1 : 0,
                    translate: visible ? "0 0" : `0 ${-height * 2}px`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
