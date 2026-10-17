import { sessionRole } from "@/lib/roles";

/** The signed-in user's role, so the header knows whether to show the Admin link. */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await sessionRole(request);
  if (!session) return Response.json({ error: "Sin sesión" }, { status: 401 });
  return Response.json({ role: session.role });
}
