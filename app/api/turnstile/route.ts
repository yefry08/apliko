/**
 * Cloudflare Turnstile (gratis): el formulario de cuenta manda aquí el token del widget y solo sigue si
 * Cloudflare lo valida. Sin TURNSTILE_SECRET_KEY la verificación está apagada y todo pasa.
 */

export const dynamic = "force-dynamic";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function POST(request: Request) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return Response.json({ ok: true, enabled: false });

  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token || token.length > 2048) return Response.json({ ok: false }, { status: 400 });

  const form = new URLSearchParams({ secret, response: token });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) form.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body: form });
    const outcome = (await res.json()) as { success?: boolean };
    return Response.json({ ok: outcome.success === true }, { status: outcome.success ? 200 : 403 });
  } catch {
    return Response.json({ ok: false }, { status: 502 });
  }
}
