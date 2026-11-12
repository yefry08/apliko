import type { CSSProperties } from "react";
import styles from "./dice-loader.module.css";

/**
 * Loading state: a die tumbling inside a circle that cycles through colors, adapted from Subaashbala's Uiverse
 * loader (MIT, notice in dice-loader.module.css). Pure CSS, so it appears at once.
 */
function Dots({ columns }: { columns: number[] }) {
  return (
    <div className={styles.row}>
      {columns.map((count, c) => (
        <div key={c} className={styles.column}>
          {Array.from({ length: count }, (_, d) => (
            <div key={d} className={styles.dot} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DiceLoader({ size = 160, label = "Cargando…" }: { size?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col items-center gap-4">
      <div className={styles.viewport} style={{ "--size": `${size}px` } as CSSProperties} aria-hidden="true">
        <div className={styles.die}>
          <div className={`${styles.side} ${styles.front}`}>
            <div className={styles.dot} />
          </div>
          <div className={`${styles.side} ${styles.back}`}>
            <Dots columns={[1, 1, 1]} />
          </div>
          <div className={`${styles.side} ${styles.left}`}>
            <Dots columns={[1, 1]} />
          </div>
          <div className={`${styles.side} ${styles.right}`}>
            <Dots columns={[2, 2]} />
          </div>
          <div className={`${styles.side} ${styles.top}`}>
            <Dots columns={[2, 1, 2]} />
          </div>
          <div className={`${styles.side} ${styles.bottom}`}>
            <Dots columns={[2, 2, 2]} />
          </div>
        </div>
      </div>
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
