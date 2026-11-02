import Link from "next/link";
import type { CSSProperties } from "react";
import { AREAS, type Area } from "@/lib/areas";

/**
 * The wordmark as a keyboard: "ApliKo" spelled out, one key per area in catalogue order.
 * The two areas past the six letters take the shapes a real keyboard has to spare, the
 * enter key and the slim side key; any further areas sit on a function row above, like
 * F1, F2… Styles: app/portada.css.
 */
const WORD = ["A", "p", "l", "i", "K", "o"];
const MAIN_KEYS = WORD.length + 2;

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
      {main.map((area, i) => {
        const glyph = WORD[i];
        const shape = i === WORD.length ? "wide" : i > WORD.length ? "slim" : null;

        return (
          <Link
            key={area.id}
            className={`keycap${shape ? ` keycap--${shape}` : ""}`}
            href={`/becas?area=${area.id}`}
            style={keyStyle(area)}
          >
            {shape !== "slim" && (
              <span className="keycap-glyph" aria-hidden="true">
                {glyph ?? "↵"}
              </span>
            )}
            <span className="keycap-label">{area.title}</span>
          </Link>
        );
      })}
    </div>
  );
}
