"use client";

import { useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Spline scene URL (Export > Code > React). Empty means: use the site's own 3D scene. */
const SPLINE_SCENE = process.env.NEXT_PUBLIC_SPLINE_SCENE ?? "";

const Spline = dynamic(() => import("@splinetool/react-spline"), { ssr: false });
const FloatingScene = dynamic(() => import("./floating-scene"), { ssr: false });

function Backdrop() {
  return (
    <div
      className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_35%,#16304d_0%,#0b1a2e_45%,#07111f_80%)]"
      aria-hidden="true"
    />
  );
}

/**
 * 3D background for the hero. Loads the Spline scene when one is configured and falls back
 * to the site's own scene, so the hero never depends on a file we don't control.
 */
export function HeroScene() {
  const reduce = useReducedMotion();
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Backdrop />
      {SPLINE_SCENE ? (
        <Spline
          scene={SPLINE_SCENE}
          renderOnDemand={!!reduce}
          onLoad={() => setLoaded(true)}
          className={cn("absolute inset-0 transition-opacity duration-1000", loaded ? "opacity-100" : "opacity-0")}
        />
      ) : (
        <div className="absolute inset-x-0 top-[6%] bottom-[38%] md:bottom-[8%] md:left-[40%] md:right-[3%]">
          <FloatingScene animate={!reduce} layout="cluster" />
        </div>
      )}
    </div>
  );
}
