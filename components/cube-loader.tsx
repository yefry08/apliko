import type { CSSProperties } from "react";
import styles from "./cube-loader.module.css";

/**
 * Loading state: a Rubik's cube that tumbles in CSS 3D, adapted from lukepadiachy's Uiverse loader (MIT, notice in
 * cube-loader.module.css). No WebGL and no JavaScript, so it shows instantly, also while three.js or Spline load.
 */
const R = "#ff3d00";
const Y = "#ffeb3b";
const G = "#4caf50";
const B = "#2196f3";
const W = "#ffffff";

const FACES: [keyof typeof styles, string[]][] = [
  ["front", [R, Y, G, B, W, Y, G, B, R]],
  ["back", [G, R, Y, B, W, R, Y, G, B]],
  ["left", [Y, G, B, R, W, G, B, Y, R]],
  ["right", [G, R, Y, B, W, R, Y, G, B]],
  ["top", [B, Y, R, G, W, Y, R, G, B]],
  ["bottom", [W, G, B, R, Y, G, B, W, R]],
];

export function CubeLoader({ size = 120, label = "Cargando…" }: { size?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col items-center gap-2">
      {/* Turned on its diagonal the cube reaches about 1.7 times its edge, so it gets that much room. */}
      <div style={{ padding: size * 0.35 }} aria-hidden="true">
        <div className={styles.loader} style={{ "--size": `${size}px` } as CSSProperties}>
        <div className={styles.cube}>
          {FACES.map(([face, colors]) => (
            <div key={face} className={`${styles.face} ${styles[face]}`}>
              {colors.map((c, i) => (
                <div key={i} className={styles.sticker} style={{ background: c }} />
              ))}
            </div>
          ))}
          </div>
        </div>
      </div>
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
