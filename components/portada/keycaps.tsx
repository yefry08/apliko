import Link from "next/link";
import type { CSSProperties } from "react";
import { AREAS, type Area } from "@/lib/areas";

/**
 * The home page's keyboard: the A+ logo key first (the whole catalogue), then one key per area with the area's
 * name written out on the cap, in catalogue order. The two areas past the first six take the shapes a real
 * keyboard has to spare, the enter key and the slim side key; any further areas sit on a function row above,
 * like F1, F2… Styles: app/portada.css.
 */
const REGULAR_KEYS = 6;
const MAIN_KEYS = REGULAR_KEYS + 2;

const keyStyle = (area: Area) =>
  ({
    "--key": area.folderColor,
    ...(area.ink ? { "--key-ink": area.ink, "--key-ink-soft": "rgba(255, 255, 255, 0.72)" } : {}),
  }) as CSSProperties;

export function Keycaps() {
  const main = AREAS.slice(0, MAIN_KEYS);
  const fn = AREAS.slice(MAIN_KEYS);
  return (
    <div className="keycaps">
      {fn.length > 0 && (
        <div className="keycaps-fn">
          {fn.map((area, i) => (
            <Link key={area.id} className="keycap keycap--fn" href={`/becas?area=${area.id}`} style={keyStyle(area)}>
              <span className="keycap-glyph" aria-hidden="true">
                F{i + 1}
              </span>
              <span className="keycap-label">{area.title}</span>
            </Link>
          ))}
        </div>
      )}
      <Link className="keycap keycap--logo" href="/becas" aria-label="ApliKo: todas las oportunidades">
        <span className="keycap-logo" aria-hidden="true">
          A<span>+</span>
        </span>
        <span className="keycap-label">Todas</span>
      </Link>
      {main.map((area, i) => {
        const shape = i === REGULAR_KEYS ? "wide" : i > REGULAR_KEYS ? "slim" : null;
        return (
          <Link
            key={area.id}
            className={`keycap${shape ? ` keycap--${shape}` : ""}`}
            href={`/becas?area=${area.id}`}
            style={keyStyle(area)}
          >
            {shape === "wide" && (
              <span className="keycap-corner" aria-hidden="true">
                ↵
              </span>
            )}
            <span className="keycap-word">{area.title}</span>
          </Link>
        );
      })}
    </div>
  );
}
