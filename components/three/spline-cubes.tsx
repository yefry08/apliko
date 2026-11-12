"use client";

import type { Application } from "@splinetool/runtime";
import { useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CubeLoader } from "@/components/cube-loader";

/** Spline scene (.splinecode URL). NEXT_PUBLIC_SPLINE_SCENE overrides it; set it empty to use only the site's scene. */
const SPLINE_SCENE = process.env.NEXT_PUBLIC_SPLINE_SCENE ?? "https://prod.spline.design/5UBTi7908RRL5Wdp/scene.splinecode";

const SplineCanvas = dynamic(() => import("./spline-canvas"), { ssr: false });
const FloatingScene = dynamic(() => import("./floating-scene"), {
  ssr: false,
  loading: () => <CubeLoader size={90} />,
});

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
 * The blue glass cubes from Spline, in the footer: the Spline scene on large screens (a CSS cube loader while it
 * loads), the site's own lighter scene on phones and with reduced motion. The Spline frame has a fixed size,
 * so once loaded it is scaled down to fit the box.
 */
export function SplineCubes({ size = 280 }: { size?: number }) {
  const reduce = useReducedMotion();
  const desktop = useIsDesktop();
  const [app, setApp] = useState<Application | null>(null);
  const [scale, setScale] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  const spline = desktop && !reduce && !!SPLINE_SCENE;

  useEffect(() => {
    if (!app) return;
    // The scene ships with its own light-grey background; let the page show through.
    app.setBackgroundColor("transparent");
    const canvas = box.current?.querySelector("canvas");
    const frame = canvas ? Math.max(canvas.clientWidth, canvas.clientHeight) : 0;
    if (frame > size) setScale(size / frame);
  }, [app, size]);

  return (
    <div ref={box} className="relative shrink-0 overflow-hidden" style={{ width: size, height: size }} aria-hidden="true">
      {!spline && (
        <div className="absolute inset-0 grid place-items-center">
          <FloatingScene animate={!reduce} />
        </div>
      )}
      {spline && !app && (
        <div className="absolute inset-0 grid place-items-center">
          <CubeLoader size={90} label="Cargando los cubos…" />
        </div>
      )}
      {spline && (
        // Centre the fixed-size Spline frame and scale it by --fit (scale does not change its measured size).
        <div
          className="absolute inset-0 transition-opacity duration-1000 [&_canvas]:absolute [&_canvas]:top-1/2 [&_canvas]:left-1/2 [&_canvas]:-translate-x-1/2 [&_canvas]:-translate-y-1/2 [&_canvas]:[scale:var(--fit)]"
          style={{ opacity: app ? 1 : 0, ["--fit" as string]: scale }}
        >
          <SplineCanvas scene={SPLINE_SCENE} onLoad={setApp} />
        </div>
      )}
    </div>
  );
}
