"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

/* ---------------- WordsPullUp ---------------- */
interface WordsPullUpProps {
  text: string;
  className?: string;
  showAsterisk?: boolean;
  style?: React.CSSProperties;
}

export const WordsPullUp = ({ text, className = "", showAsterisk = false, style }: WordsPullUpProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const words = text.split(" ");

  return (
    <div ref={ref} className={`inline-flex flex-wrap ${className}`} style={style}>
      {words.map((word, i) => {
        const isLast = i === words.length - 1;
        return (
          <motion.span
            key={i}
            initial={reduce ? false : { y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="relative inline-block"
            style={{ marginRight: isLast ? 0 : "0.25em" }}
          >
            {word}
            {showAsterisk && isLast && (
              <span className="absolute -right-[0.3em] top-[0.65em] text-[0.31em]">*</span>
            )}
          </motion.span>
        );
      })}
    </div>
  );
};

/* ---------------- WordsPullUpMultiStyle ---------------- */
interface Segment {
  text: string;
  className?: string;
}

interface WordsPullUpMultiStyleProps {
  segments: Segment[];
  className?: string;
  style?: React.CSSProperties;
}

export const WordsPullUpMultiStyle = ({ segments, className = "", style }: WordsPullUpMultiStyleProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const reduce = useReducedMotion();

  const words: { word: string; className?: string }[] = [];
  segments.forEach((seg) => {
    seg.text.split(" ").forEach((w) => {
      if (w) words.push({ word: w, className: seg.className });
    });
  });

  return (
    <div ref={ref} className={`inline-flex flex-wrap ${className}`} style={style}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={reduce ? false : { y: 20, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className={`inline-block ${w.className ?? ""}`}
          style={{ marginRight: "0.25em" }}
        >
          {w.word}
        </motion.span>
      ))}
    </div>
  );
};

/* ---------------- Hero ---------------- */
export interface NavItem {
  label: string;
  href: string;
}

export interface PrismaHeroProps {
  title?: string;
  description?: string;
  cta?: NavItem;
  navItems?: NavItem[];
  /** Full-bleed background layer, e.g. a 3D scene. */
  background?: React.ReactNode;
  /** Rendered under the headline column on large screens, e.g. a live stat. */
  aside?: React.ReactNode;
}

const DEFAULT_NAV: NavItem[] = [
  { label: "Becas", href: "/becas" },
  { label: "¿Soy elegible?", href: "/becas?perfil=rd" },
  { label: "Mis becas", href: "/mis-becas" },
];

const PrismaHero = ({
  title = "Apliko",
  description = "Becas, fellowships e internships verificados para estudiantes dominicanos y latinos. Filtra por tu ciudadanía y descubre a cuáles sí puedes postular.",
  cta = { label: "Encuentra tu beca", href: "/becas" },
  navItems = DEFAULT_NAV,
  background,
  aside,
}: PrismaHeroProps) => {
  const reduce = useReducedMotion();
  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { y: 20, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <section className="h-[100svh] min-h-[560px] w-full p-2 md:p-3">
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-card md:rounded-[2rem]">
        {background}

        {/* Noise overlay */}
        <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.7] mix-blend-overlay" />

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />

        {/* Navbar */}
        <nav aria-label="Principal" className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
          <div className="flex items-center gap-4 rounded-b-2xl bg-black px-4 py-2 sm:gap-8 md:gap-12 md:rounded-b-3xl md:px-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap text-xs text-[#E1E0CC]/80 transition-colors hover:text-[#E1E0CC] focus-visible:text-[#E1E0CC] md:text-sm"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Hero content */}
        <div className="absolute inset-x-0 bottom-0 px-4 pb-2 sm:px-6 md:px-10">
          <div className="grid grid-cols-12 items-end gap-4">
            <div className="col-span-12 lg:col-span-8">
              {aside}
              <h1 className="font-display text-[26vw] font-medium leading-[0.85] tracking-[-0.07em] text-[#E1E0CC] sm:text-[24vw] md:text-[22vw] lg:text-[16vw] xl:text-[17vw] 2xl:text-[18vw]">
                <WordsPullUp text={title} showAsterisk />
              </h1>
            </div>

            <div className="col-span-12 flex flex-col gap-5 pb-6 lg:col-span-4 lg:pb-10">
              <motion.p
                {...enter(0.5)}
                className="max-w-[46ch] text-sm text-primary/80 sm:text-base md:text-lg"
                style={{ lineHeight: 1.3 }}
              >
                {description}
              </motion.p>

              <motion.div {...enter(0.7)} className="self-start">
                <Link
                  href={cta.href}
                  className="group inline-flex items-center gap-2 rounded-full bg-primary py-1 pl-5 pr-1 text-sm font-medium text-primary-foreground transition-all hover:gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-larimar sm:text-base"
                >
                  {cta.label}
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110 sm:h-10 sm:w-10">
                    <ArrowRight className="h-4 w-4 text-[#E1E0CC]" aria-hidden="true" />
                  </span>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { PrismaHero };
