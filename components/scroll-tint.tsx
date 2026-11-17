"use client";

import { useEffect } from "react";

/**
 * The page background drifts through soft pastel tints as you scroll: white at the top, then lavender, sky, mint,
 * peach and blush, ending on lavender again. Light enough for text to keep its contrast, strong enough to notice.
 * It writes --page-tint on <html> at most once per frame; body, the home page and the headers read it
 * (app/globals.css, app/portada.css, components/site-chrome.tsx). No React re-renders.
 */
const STOPS = ["#FFFFFF", "#F0EAFF", "#E3EFFF", "#E2F6EA", "#FFEEDB", "#FDE6F0", "#EEE9FF"];

export function ScrollTint() {
  useEffect(() => {
    const rgb = STOPS.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
    const root = document.documentElement;
    let frame = 0;

    const paint = () => {
      frame = 0;
      const max = root.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const x = progress * (rgb.length - 1);
      const i = Math.min(rgb.length - 2, Math.floor(x));
      const f = x - i;
      const [r, g, b] = rgb[i].map((v, k) => Math.round(v + (rgb[i + 1][k] - v) * f));
      root.style.setProperty("--page-tint", `rgb(${r} ${g} ${b})`);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
