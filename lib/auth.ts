import { createRemoteJWKSet, jwtVerify } from "jose";

const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID ?? "";

/** Neon Auth (Stack) signs the access token; the JWKS is per project, so only ours verifies. */
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export async function getSessionUserId(request: Request): Promise<string | null> {
  if (!projectId) return null;
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  jwks ??= createRemoteJWKSet(new URL(`https://api.stack-auth.com/api/v1/projects/${projectId}/.well-known/jwks.json`));
  try {
    const { payload } = await jwtVerify(token, jwks);
    return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}
