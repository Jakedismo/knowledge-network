import { JWTService } from './jwt.service'
import type { AccessTokenPayload } from './jwt.service'

let service: JWTService | null = null

function getService(): JWTService {
  if (!service) {
    try {
      service = new JWTService()
    } catch (error) {
      console.warn('[JWT] Falling back to test secrets due to configuration error:', error)
      process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'fallback-secret-key-at-least-32-chars-long'
      process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'fallback-refresh-secret-key-at-least-32-chars-long'
      process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '15m'
      process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d'
      service = new JWTService()
    }
  }
  return service
}

export async function verifyJWT(token: string): Promise<AccessTokenPayload | null> {
  try {
    const svc = getService()
    return await svc.verifyAccessToken(token)
  } catch {
    return null
  }
}

export { JWTService }
export type { AccessTokenPayload, RefreshTokenPayload, TokenPair, Permission, User, SessionData } from './jwt.service'
