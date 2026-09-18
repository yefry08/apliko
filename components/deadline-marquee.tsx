"use client";

import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";
import { OpportunityCard } from "@/components/opportunity-bits";
import type { Opportunity } from "@/lib/types";

const SPEED = 40; // px per second

/**
 * Endless row of the opportunities closing soonest. The list is rendered twice so the
 * loop is seamless; it pauses on hover/focus and becomes a scrollable row when the
 * viewer prefers reduced motion.
 */
export function DeadlineMarquee({ items }: { items: Opportunity[] }) {
  const reduce = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [hovered, setHovered] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  useAnimationFrame((_, delta) => {
    if (reduce || hovered || userPaused || !track.current) return;
    const half = track.current.scrollWidth / 2;
    let next = x.get() - (SPEED * delta) / 1000;
    if (next <= -half) next += half;
    x.set(next);
  });

  const slides = (copy: number) =>
    items.map((o, i) => (
      <li key={`${copy}-${o.id}`} className="relative w-[300px] shrink-0 pt-3 sm:w-[340px]" inert={copy === 1 || undefined}>
        <span className="eyebrow absolute right-4 top-0 z-10 rounded-full border bg-background px-2 py-0.5 tabular-nums">
          {i + 1} de {items.length}
        </span>
        <OpportunityCard o={o} />
      </li>
    ));

  if (reduce) {
    return (
      <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">{slides(0)}</ul>
    );
  }

  return (
    <div>
      <div
        className="overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]"
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocusCapture={() => setHovered(true)}
        onBlurCapture={() => setHovered(false)}
      >
        <motion.div ref={track} style={{ x }} className="flex w-max">
          <ul className="flex gap-4 pr-4">{slides(0)}</ul>
          <ul className="flex gap-4 pr-4" aria-hidden="true">
            {slides(1)}
          </ul>
        </motion.div>
      </div>
      <button
        type="button"
        onClick={() => setUserPaused((p) => !p)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        {userPaused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
        {userPaused ? "Reanudar carrusel" : "Pausar carrusel"}
      </button>
    </div>
  );
}
