"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal } from "react-dom";

export interface AreaSummary {
  id: string;
  number: string;
  title: string;
  tab: string;
  folderName: [string, string];
  description: string;
  covers: string;
  folderColor: string;
  cardColor: string;
  numberColor: string;
  count: number;
  upcoming: { slug: string; name: string; sponsor?: string; deadline: string }[];
}

const BOX = "/assets/opportunities-box.svg";

const useMounted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Area list + archive box + case dialog. One piece of state (`active`) drives both the pill
 * highlight and the matching folder, so hover and focus stay in sync in either direction.
 */
export function AreaExplorer({ areas }: { areas: AreaSummary[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const mounted = useMounted();
  const current = areas.find((a) => a.id === openId) ?? null;

  const open = (id: string, el: HTMLElement) => {
    trigger.current = el;
    setOpenId(id);
  };

  useEffect(() => {
    const d = dialog.current;
    if (current && d && !d.open) d.showModal();
  }, [current]);

  const onClose = useCallback(() => {
    setOpenId(null);
    trigger.current?.focus();
  }, []);

  const hoverProps = (id: string) => ({
    onPointerEnter: () => setActive(id),
    onPointerLeave: () => setActive((a) => (a === id ? null : a)),
    onFocus: () => setActive(id),
    onBlur: () => setActive((a) => (a === id ? null : a)),
  });

  return (
    <>
      <section className="collection" aria-label="Áreas del catálogo">
        <div className="content">
          <ul className="project-list" role="list">
            {areas.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className="project-card"
                  aria-haspopup="dialog"
                  data-active={active === a.id ? "" : undefined}
                  style={{ "--card-bg": a.cardColor, "--number-color": a.numberColor } as CSSProperties}
                  onClick={(e) => open(a.id, e.currentTarget)}
                  {...hoverProps(a.id)}
                >
                  <span className="project-number">{a.number}</span>
                  <span className="project-text">
                    <span className="project-title">{a.title}</span>
                    <span className="project-description">
                      {a.description} <span className="project-count">{a.count} abiertas.</span>
                    </span>
                  </span>
                  <span className="project-arrow">
                    <Arrow />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="archive" data-open={active ? "" : undefined}>
          <div className="archive-stage">
            {/* eslint-disable-next-line @next/next/no-img-element -- raw SVG artwork: the clip-path masks need the unprocessed image */}
            <img className="box-back" src={BOX} alt="" aria-hidden="true" />
            <div className="folder-deck">
              {areas.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  className={`project-folder folder-${i + 1}`}
                  data-project={a.id}
                  data-active={active === a.id ? "" : undefined}
                  aria-haspopup="dialog"
                  aria-label={`Abrir la carpeta ${a.title}: ${a.count} oportunidades abiertas`}
                  style={{ "--folder": a.folderColor } as CSSProperties}
                  onClick={(e) => open(a.id, e.currentTarget)}
                  {...hoverProps(a.id)}
                >
                  <span className="folder-tab">{a.tab}</span>
                  <span className="folder-face">
                    <small>
                      Área / {a.number} · {a.count} abiertas
                    </small>
                    <strong className="folder-logo">
                      {a.folderName[0]}
                      <br />
                      {a.folderName[1]}
                    </strong>
                    <span className="folder-open">Abrir carpeta ↗</span>
                  </span>
                </button>
              ))}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- raw SVG artwork: the clip-path masks need the unprocessed image */}
            <img className="box-front" src={BOX} alt="" aria-hidden="true" />
          </div>
        </div>
      </section>

      {mounted &&
        createPortal(
          <dialog
            id="case-overlay"
            ref={dialog}
            className="case-overlay"
            aria-labelledby="case-title"
            onClose={onClose}
            onClick={(e) => {
              // Clicks on the backdrop land on the <dialog> itself, outside its box.
              const r = e.currentTarget.getBoundingClientRect();
              const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
              if (!inside) e.currentTarget.close();
            }}
          >
            {current && (
              <>
                <button type="button" className="case-close" aria-label="Cerrar" onClick={() => dialog.current?.close()}>
                  ×
                </button>
                <p className="case-number">Área / {current.number}</p>
                <h2 id="case-title" className="case-title">
                  {current.title}
                </h2>
                <p className="case-type">
                  {current.count} {current.count === 1 ? "oportunidad abierta" : "oportunidades abiertas"} hoy
                </p>

                <section className="case-section">
                  <h3>Qué incluye</h3>
                  <p>{current.covers}</p>
                </section>

                <section className="case-section">
                  <h3>Cierran pronto</h3>
                  {current.upcoming.length ? (
                    <ul className="case-list" role="list">
                      {current.upcoming.map((o) => (
                        <li key={o.slug}>
                          <Link href={`/becas/${o.slug}`}>{o.name}</Link>
                          <span>
                            {o.sponsor ? `${o.sponsor} · ` : ""}
                            {o.deadline}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Ahora mismo no hay convocatorias con fecha de cierre en esta área.</p>
                  )}
                </section>

                <section className="case-section">
                  <h3>Explora el área</h3>
                  <p>
                    Todas las oportunidades de {current.title.toLowerCase()} en el catálogo, con el filtro por tu situación.
                  </p>
                  <Link className="case-cta" href={`/becas?area=${current.id}`}>
                    Ver las {current.count} en el catálogo ↗
                  </Link>
                </section>
              </>
            )}
          </dialog>,
          document.body,
        )}
    </>
  );
}
