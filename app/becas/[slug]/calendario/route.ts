import { buildIcs } from "@/lib/ics";
import { getBySlug } from "@/lib/opportunities";

export async function GET(request: Request, ctx: RouteContext<"/becas/[slug]/calendario">) {
  const { slug } = await ctx.params;
  const o = getBySlug(slug);
  if (!o || o.deadline.kind !== "exacta") {
    return new Response("Esta oportunidad no tiene una fecha de cierre exacta.", { status: 404 });
  }
  const ics = buildIcs([o], new URL(request.url).origin);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${o.slug}.ics"`,
    },
  });
}
