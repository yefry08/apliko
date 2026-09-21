"use client";

import type { Application } from "@splinetool/runtime";
import { useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore } from "react";

/** Spline scene (.splinecode URL). NEXT_PUBLIC_SPLINE_SCENE overrides it; set it empty to use only the site's scene. */
const SPLINE_SCENE = process.env.NEXT_PUBLIC_SPLINE_SCENE ?? "https://prod.spline.design/5UBTi7908RRL5Wdp/scene.splinecode";

const SplineCanvas = dynamic(() => import("./spline-canvas"), { ssr: false });
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

/**
 * 3D art for the portada hero: the Spline scene on large screens, the site's own lighter
 * scene everywhere else (and while Spline loads). Layout lives in app/portada.css.
 */
export function HeroScene() {
  const reduce = useReducedMotion();
  const desktop = useIsDesktop();
  const [app, setApp] = useState<Application | null>(null);
  // Reduced motion keeps the site's own scene, which can hold still.
  const spline = desktop && !reduce && !!SPLINE_SCENE;

  // The scene ships with its own light-grey background; let the page show through.
  useEffect(() => {
    app?.setBackgroundColor("transparent");
  }, [app]);

  return (
    <div className="hero-scene" aria-hidden="true">
      {(!spline || !app) && (
        <div className="hero-scene__fallback" data-waiting={spline ? "" : undefined}>
          <FloatingScene animate={!reduce} />
        </div>
      )}
      {spline && (
        <div className="hero-scene__spline" data-loaded={app ? "" : undefined}>
          <SplineCanvas scene={SPLINE_SCENE} onLoad={setApp} />
        </div>
      )}
    </div>
  );
}
