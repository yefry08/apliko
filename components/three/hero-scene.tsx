"use client";

import type { Application } from "@splinetool/runtime";
import { useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

/** Spline scene (Export > Code > React). NEXT_PUBLIC_SPLINE_SCENE overrides it; set it empty to use only the site's scene. */
const SPLINE_SCENE = process.env.NEXT_PUBLIC_SPLINE_SCENE ?? "https://prod.spline.design/5UBTi7908RRL5Wdp/scene.splinecode";

const Spline = dynamic(() => import("@splinetool/react-spline"), { ssr: false });
const FloatingScene = dynamic(() => import("./floating-scene"), { ssr: false });

const DESKTOP = "(min-width: 1024px)";

/** Spline's runtime is heavy for phones, so it only loads on large screens. */
function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(DESKTOP);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

function Backdrop() {
  return (
    <div
      className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_35%,#16304d_0%,#0b1a2e_45%,#07111f_80%)]"
      aria-hidden="true"
    />
  );
}

/**
 * 3D background for the hero: the Spline scene on large screens, the site's own lighter
 * scene everywhere else (and while Spline loads).
 */
export function HeroScene() {
  const reduce = useReducedMotion();
  const desktop = useIsDesktop();
  const [app, setApp] = useState<Application | null>(null);
  const loaded = app !== null;
  const spline = desktop && !!SPLINE_SCENE;
  const box = useRef<HTMLDivElement>(null);

  // The scene ships with a fixed canvas size and its own light background: fit it to the hero
  // and let the site's night-blue show through.
  useEffect(() => {
    const el = box.current;
    if (!app || !el) return;
    app.setBackgroundColor("transparent");
    const fit = () => app.setSize(el.clientWidth, el.clientHeight);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [app]);

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Backdrop />
      {(!spline || !loaded) && (
        <div
          className={cn(
            "absolute inset-x-0 top-[6%] bottom-[38%] md:bottom-[8%] md:left-[40%] md:right-[3%] transition-opacity duration-700",
            spline && "opacity-40",
          )}
        >
          <FloatingScene animate={!reduce} layout="cluster" />
        </div>
      )}
      {spline && (
        <div ref={box} className={cn("absolute inset-0 transition-opacity duration-1000", loaded ? "opacity-100" : "opacity-0")}>
          <Spline scene={SPLINE_SCENE} renderOnDemand={!!reduce} onLoad={setApp} />
        </div>
      )}
    </div>
  );
}
