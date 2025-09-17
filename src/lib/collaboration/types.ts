export type CollaborationWsToken = {
  url: string
  token: string
  expiresAt: string // ISO8601
  roomId: string
}

export type CollaborationClaims = {
  sub: string // user id
  sessionId: string
  workspaceId?: string
  knowledgeId: string
  roles: string[]
  scope: string[] // e.g., ["edit:knowledge:{id}"]
  aud: 'collab-ws'
  iss: 'web-app'
  iat: number
  exp: number
  nonce: string
  ctx?: {
    requestId?: string
    userAgent?: string
    ipHash?: string
  }
}

export type PresenceState = Record<string, unknown>

export type CollaborationEvent =
  | { type: 'lock_acquired'; knowledgeId: string; userId: string; timestamp: string }
  | { type: 'lock_released'; knowledgeId: string; userId: string; timestamp: string }
  | { type: 'presence_summary'; knowledgeId: string; users: string[]; timestamp: string }

