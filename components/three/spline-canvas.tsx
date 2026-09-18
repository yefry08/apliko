"use client";

import { Application } from "@splinetool/runtime";
import { useEffect, useRef } from "react";

/**
 * Minimal Spline embed. Built on the runtime directly (instead of @splinetool/react-spline)
 * to force the WebGL renderer: the auto-selected WebGPU path logs "destroyed texture" errors.
 */
export default function SplineCanvas({ scene, onLoad }: { scene: string; onLoad?: (app: Application) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const loaded = useRef(onLoad);
  useEffect(() => {
    loaded.current = onLoad;
  });

  useEffect(() => {
    if (!canvas.current) return;
    const app = new Application(canvas.current, { renderer: "webgl" });
    let alive = true;
    app.load(scene).then(() => {
      if (alive) loaded.current?.(app);
    });
    return () => {
      alive = false;
      app.dispose();
    };
  }, [scene]);

  return <canvas ref={canvas} />;
}
