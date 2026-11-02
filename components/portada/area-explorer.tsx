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
  ink?: string;
  cardColor: string;
  numberColor: string;
  representative: {
    slug: string;
    name: string;
    role: string;
    photo?: string;
    initials: string;
    /** Takes paid 1-1 sessions at /asesorias. */
    bookable: boolean;
  } | null;
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

/** Tab offsets cycle so every label stays readable above the file in front of it. */
const TAB_X = [0, 26, 52, 12, 38];

/**
 * Where file i of n sits in the box: front (first) to back (last), stepping up and to the right across the
 * same span the box artwork was drawn for, however many areas there are.
 */
function folderSpot(i: number, n: number) {
  const step = n > 1 ? i / (n - 1) : 0;
  const tabX = TAB_X[i % TAB_X.length];
  return {
    flush: tabX === 0,
    style: {
      "--x": `${10 + 16.1 * step}%`,
      "--y": `${21 - 24.5 * step}%`,
      "--z": n - i,
      "--tab-x": `${tabX}%`,
    },
  };
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
                  className={`project-folder${folderSpot(i, areas.length).flush ? " folder--flush" : ""}`}
                  data-project={a.id}
                  data-active={active === a.id ? "" : undefined}
                  aria-haspopup="dialog"
                  aria-label={`Abrir la carpeta ${a.title}: ${a.count} oportunidades abiertas`}
                  style={
                    {
                      ...folderSpot(i, areas.length).style,
                      "--folder": a.folderColor,
                      ...(a.ink ? { "--folder-ink": a.ink } : {}),
                    } as CSSProperties
                  }
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

                {current.representative && (
                  <section className="case-section">
                    <h3>Representante</h3>
                    <div className="case-rep">
                      <span className="case-rep-photo">
                        {current.representative.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element -- tiny avatar inside a portal dialog
                          <img src={current.representative.photo} alt="" width={56} height={56} />
                        ) : (
                          <span aria-hidden="true">{current.representative.initials}</span>
                        )}
                      </span>
                      <span>
                        <strong>{current.representative.name}</strong>
                        <span className="case-rep-role">
                          {current.representative.role} · {current.title}
                        </span>
                        {current.representative.bookable && (
                          <Link href={`/asesorias?asesor=${current.representative.slug}`} className="case-rep-link">
                            Reserva una asesoría 1-1 ↗
                          </Link>
                        )}
                      </span>
                    </div>
                  </section>
                )}

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
