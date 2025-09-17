import jwt from 'jsonwebtoken'
import { z } from 'zod'
import type { CollaborationClaims, CollaborationWsToken } from './types'

const envSchema = z.object({
  NEXT_PUBLIC_COLLAB_WS_URL: z.string().url().default('ws://localhost:8080/collab'),
  COLLAB_WS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  JWT_SECRET: z.string().min(32).catch('test-jwt-secret-key-for-testing-minimum-32-chars'),
})

export async function mintWsToken(params: {
  knowledgeId: string
  requestId?: string
  userAgent?: string
  ipHash?: string
}): Promise<CollaborationWsToken & { claims: CollaborationClaims }> {
  const env = envSchema.parse(process.env)
  const access = await getAccess()

  const nowSec = Math.floor(Date.now() / 1000)
  const exp = nowSec + env.COLLAB_WS_TOKEN_TTL_SECONDS
  const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36)

  const scope = [`edit:knowledge:${params.knowledgeId}`]

  const claims: CollaborationClaims = {
    sub: access.sub,
    sessionId: access.sessionId,
    workspaceId: access.workspaceId,
    knowledgeId: params.knowledgeId,
    roles: access.roles ?? [],
    scope,
    aud: 'collab-ws',
    iss: 'web-app',
    iat: nowSec,
    exp,
    nonce,
    ctx: {
      requestId: params.requestId,
      userAgent: params.userAgent,
      ipHash: params.ipHash,
    },
  }

  // Reuse access token secret for HMAC; align with WS service key material
  // Note: When WS migrates to JWKS, rotate here accordingly.
  const secret = env.JWT_SECRET

  const token = jwt.sign(claims, secret, { algorithm: 'HS256' })

  return {
    url: env.NEXT_PUBLIC_COLLAB_WS_URL,
    token,
    expiresAt: new Date(exp * 1000).toISOString(),
    roomId: `kn:${params.knowledgeId}`,
    claims,
  }
}

async function getAccess() {
  // The jwtService currently does not expose a direct context getter.
  // In API routes we will parse the Authorization header and verify it,
  // then pass the payload here via a closure; for convenience this helper
  // reads a thread-local-like global when present (set by middleware later).
  const g = globalThis as any
  const payload = g.__collab_access_payload as
    | {
        sub: string
        sessionId: string
        workspaceId?: string
        roles?: string[]
      }
    | undefined
  if (!payload) throw new Error('Missing auth context')
  return payload
}
