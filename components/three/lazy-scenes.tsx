"use client";

import { useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CubeLoader } from "@/components/cube-loader";
import { DiceLoader } from "@/components/dice-loader";
import type { TowerBlock } from "./jenga-tower";

const JengaTower = dynamic(() => import("./jenga-tower"), {
  ssr: false,
  loading: () => <TowerPlaceholder />,
});

const RubikScene = dynamic(() => import("./rubik-scene"), {
  ssr: false,
  loading: () => (
    <div className="grid aspect-square w-full max-w-[480px] place-items-center">
      <CubeLoader size={110} label="Armando el cubo…" />
    </div>
  ),
});

const SplineCubes = dynamic(() => import("./spline-cubes").then((m) => m.SplineCubes), {
  ssr: false,
  loading: () => <FooterPlaceholder />,
});

function FooterPlaceholder() {
  return (
    <div className="grid h-[280px] w-[280px] place-items-center" aria-hidden="true">
      <CubeLoader size={70} />
    </div>
  );
}

function TowerPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <DiceLoader size={150} label="Armando la torre…" />
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

/** The portada hero's playable Rubik's cube (a CSS cube loader while three.js loads). */
export function HeroRubik() {
  return <RubikScene large />;
}

/** The footer's blue Spline cubes: they load only once the footer comes near the screen, and stay mounted. */
export function LazySplineCubes() {
  const [ref, near] = useNearViewport<HTMLDivElement>(true);
  return <div ref={ref}>{near ? <SplineCubes /> : <FooterPlaceholder />}</div>;
}

/** The Jenga tower of the next deadlines, soonest at the top; a block opens its page. */
export function LazyJengaTower({ blocks }: { blocks: TowerBlock[] }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [ref, near] = useNearViewport<HTMLDivElement>();
  return (
    <div ref={ref} className="h-full w-full">
      {near ? (
        <JengaTower blocks={blocks} animate={!reduce} onSelect={(slug) => router.push(`/becas/${slug}`)} />
      ) : (
        <TowerPlaceholder />
      )}
    </div>
  );
}
