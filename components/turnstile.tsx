"use client";

import { useEffect, useRef } from "react";

/** Public: Cloudflare shows it to the browser. Without it the widget is off and forms work as before. */
export const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript() {
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("No cargó Turnstile"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Cloudflare's "no soy un robot". Calls onToken with a fresh token, and with "" when it expires or fails.
 * Bump `resetKey` after each use: a token is valid only once.
 */
export function Turnstile({ onToken, resetKey = 0 }: { onToken: (token: string) => void; resetKey?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const callback = useRef(onToken);
  useEffect(() => {
    callback.current = onToken;
  });

  useEffect(() => {
    if (!turnstileSiteKey || !box.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return;
        widget.current = window.turnstile.render(box.current, {
          sitekey: turnstileSiteKey,
          language: "es",
          theme: "light",
          callback: (token: string) => callback.current(token),
          "expired-callback": () => callback.current(""),
          "error-callback": () => callback.current(""),
        });
      })
      .catch(() => callback.current(""));
    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey && widget.current && window.turnstile) {
      window.turnstile.reset(widget.current);
      callback.current("");
    }
  }, [resetKey]);

  if (!turnstileSiteKey) return null;
  return <div ref={box} className="min-h-[65px]" />;
}

/** Asks our server to confirm the token with Cloudflare. True when Turnstile is off. */
export async function passesTurnstile(token: string): Promise<boolean> {
  if (!turnstileSiteKey) return true;
  if (!token) return false;
  const res = await fetch("/api/turnstile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).catch(() => null);
  return Boolean(res?.ok && ((await res.json()) as { ok?: boolean }).ok);
}
