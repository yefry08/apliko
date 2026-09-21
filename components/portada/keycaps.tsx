import Link from "next/link";
import type { CSSProperties } from "react";
import { AREAS } from "@/lib/areas";

/**
 * The wordmark as a keyboard: "ApliKo" spelled out, one key per area in catalogue order.
 * The two areas past the six letters take the shapes a real keyboard has to spare, the
 * enter key and the slim side key, so the eight areas fit the word. Styles: app/portada.css.
 */
const WORD = ["A", "p", "l", "i", "K", "o"];

export function Keycaps() {
  return (
    <div className="keycaps">
      {AREAS.map((area, i) => {
        const glyph = WORD[i];
        const shape = i === WORD.length ? "wide" : i > WORD.length ? "slim" : null;

        return (
          <Link
            key={area.id}
            className={`keycap${shape ? ` keycap--${shape}` : ""}`}
            href={`/becas?area=${area.id}`}
            style={{ "--key": area.folderColor } as CSSProperties}
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
