"use client";

import { useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { GlobeDestination } from "./globe-scene";

const GlobeScene = dynamic(() => import("./globe-scene"), {
  ssr: false,
  loading: () => <GlobePlaceholder />,
});

const RubikScene = dynamic(() => import("./rubik-scene"), {
  ssr: false,
  loading: () => <RubikPlaceholder />,
});

function RubikPlaceholder() {
  return <div className="h-[200px] w-[200px] rounded-2xl bg-muted/40" aria-hidden="true" />;
}

function GlobePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
      <div className="aspect-square w-[62%] rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffffff,#EDF3FF_70%)] shadow-[0_0_80px_-30px_#3054DE]" />
    </div>
  );
}

/**
 * Mounts children only while the element is near the viewport, so off-screen WebGL stops. With `once`, it stays
 * true after the first time (for things that keep state, like the cube).
 */
function useNearViewport<T extends Element>(once = false) {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          if (once) io.disconnect();
        } else if (!once) {
          setNear(false);
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);
  return [ref, near] as const;
}

/** The footer's Rubik's cube: three.js loads only once the footer comes near the screen, and stays mounted. */
export function LazyRubik() {
  const [ref, near] = useNearViewport<HTMLDivElement>(true);
  return <div ref={ref}>{near ? <RubikScene /> : <RubikPlaceholder />}</div>;
}

export function LazyGlobe({ destinations }: { destinations: GlobeDestination[] }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [ref, near] = useNearViewport<HTMLDivElement>();
  return (
    <div ref={ref} className="h-full w-full">
      {near ? (
        <GlobeScene
          destinations={destinations}
          animate={!reduce}
          onSelect={(name) => router.push(`/becas?destino=${encodeURIComponent(name)}`)}
        />
      ) : (
        <GlobePlaceholder />
      )}
    </div>
  );
}
