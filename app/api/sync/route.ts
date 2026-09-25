import { getSessionUserId } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { parseExpediente } from "@/lib/expediente";
import type { Stage } from "@/lib/store";

/** Mis becas y Mi perfil, sincronizados: el navegador nunca habla con Postgres, solo con estas rutas. */

export const dynamic = "force-dynamic";

const STAGES = new Set<Stage>(["guardada", "preparando", "enviada", "resultado"]);
const SITUATIONS = new Set(["rd", "latam", "eeuu-ciudadano", "eeuu-residente", "daca"]);
/** Un perfil completo con muchos ensayos cabe holgado; esto solo frena abusos. */
const MAX_EXPEDIENTE_CHARS = 400_000;

interface ItemPayload {
  id: string;
  stage: Stage;
  notes: string;
  savedAt: string;
  updatedAt: string;
}

const isIso = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));

function parseItem(raw: unknown): ItemPayload | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { id, stage, notes, savedAt, updatedAt } = raw as Record<string, unknown>;
  if (typeof id !== "string" || !id || id.length > 200) return null;
  if (typeof stage !== "string" || !STAGES.has(stage as Stage)) return null;
  if (typeof notes !== "string" || notes.length > 5000) return null;
  if (!isIso(savedAt) || !isIso(updatedAt)) return null;
  return { id, stage: stage as Stage, notes, savedAt, updatedAt };
}

export async function GET(request: Request) {
  const userId = await getSessionUserId(request);
  if (!userId) return Response.json({ error: "Sin sesión" }, { status: 401 });
  const sql = getSql();
  if (!sql) return Response.json({ error: "Falta DATABASE_URL" }, { status: 500 });

  const [rows, profile, expediente] = await Promise.all([
    sql`select opportunity_id, stage, notes, saved_at, updated_at
        from tracked_items where user_id = ${userId}`,
    sql`select situation, updated_at from profiles where user_id = ${userId}`,
    sql`select data, updated_at from expedientes where user_id = ${userId}`,
  ]);

  return Response.json({
    items: rows.map((r) => ({
      id: r.opportunity_id as string,
      stage: r.stage as Stage,
      notes: r.notes as string,
      savedAt: new Date(r.saved_at as string).toISOString(),
      updatedAt: new Date(r.updated_at as string).toISOString(),
    })),
    profile: profile[0]?.situation ?? null,
    profileUpdatedAt: profile[0] ? new Date(profile[0].updated_at as string).toISOString() : null,
    expediente: expediente[0]?.data ?? null,
    expedienteUpdatedAt: expediente[0] ? new Date(expediente[0].updated_at as string).toISOString() : null,
  });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId(request);
  if (!userId) return Response.json({ error: "Sin sesión" }, { status: 401 });
  const sql = getSql();
  if (!sql) return Response.json({ error: "Falta DATABASE_URL" }, { status: 500 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Cuerpo inválido" }, { status: 400 });

  const upserts = Array.isArray(body.upserts) ? body.upserts.map(parseItem) : [];
  if (upserts.some((i) => i === null)) return Response.json({ error: "Beca inválida" }, { status: 400 });
  const items = upserts as ItemPayload[];

  const deletes = Array.isArray(body.deletes) ? body.deletes.filter((d): d is string => typeof d === "string") : [];

  const profileRaw = body.profile as { situation?: unknown; updatedAt?: unknown } | undefined;
  const hasProfile = profileRaw !== undefined && profileRaw !== null;
  const situation =
    hasProfile && typeof profileRaw.situation === "string" && SITUATIONS.has(profileRaw.situation)
      ? profileRaw.situation
      : null;
  if (hasProfile && !isIso(profileRaw.updatedAt)) return Response.json({ error: "Perfil inválido" }, { status: 400 });

  const expedienteRaw = body.expediente as { data?: unknown; updatedAt?: unknown } | undefined;
  const hasExpediente = expedienteRaw !== undefined && expedienteRaw !== null;
  if (hasExpediente && (!isIso(expedienteRaw.updatedAt) || JSON.stringify(expedienteRaw.data ?? null).length > MAX_EXPEDIENTE_CHARS)) {
    return Response.json({ error: "Perfil maestro inválido" }, { status: 400 });
  }

  const queries = [];
  for (const i of items) {
    queries.push(sql`
      insert into tracked_items (user_id, opportunity_id, stage, notes, saved_at, updated_at)
      values (${userId}, ${i.id}, ${i.stage}, ${i.notes}, ${i.savedAt}, ${i.updatedAt})
      on conflict (user_id, opportunity_id) do update
        set stage = excluded.stage, notes = excluded.notes, updated_at = excluded.updated_at`);
  }
  if (deletes.length) {
    queries.push(sql`delete from tracked_items where user_id = ${userId} and opportunity_id = any(${deletes})`);
  }
  if (hasProfile) {
    queries.push(sql`
      insert into profiles (user_id, situation, updated_at)
      values (${userId}, ${situation}, ${profileRaw.updatedAt as string})
      on conflict (user_id) do update
        set situation = excluded.situation, updated_at = excluded.updated_at`);
  }

  if (hasExpediente) {
    const data = JSON.stringify(parseExpediente(expedienteRaw.data));
    queries.push(sql`
      insert into expedientes (user_id, data, updated_at)
      values (${userId}, ${data}::jsonb, ${expedienteRaw.updatedAt as string})
      on conflict (user_id) do update
        set data = excluded.data, updated_at = excluded.updated_at`);
  }

  if (queries.length) await sql.transaction(queries);
  return Response.json({ ok: true, upserted: items.length, deleted: deletes.length });
}
