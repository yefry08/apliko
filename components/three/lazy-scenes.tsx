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
const FloatingScene = dynamic(() => import("./floating-scene"), { ssr: false });

function GlobePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
      <div className="aspect-square w-[62%] rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffffff,#EDF3FF_70%)] shadow-[0_0_80px_-30px_#3054DE]" />
    </div>
  );
}

/** Mounts children only while the element is near the viewport, so off-screen WebGL stops. */
function useNearViewport<T extends Element>() {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, near] as const;
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

export function LazyFloating() {
  const reduce = useReducedMotion();
  const [ref, near] = useNearViewport<HTMLDivElement>();
  return (
    <div ref={ref} className="h-full w-full" aria-hidden="true">
      {near && <FloatingScene animate={!reduce} />}
    </div>
  );
}
