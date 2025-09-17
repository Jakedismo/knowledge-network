import { jwtService } from './jwt.service'

export async function verifyJWT(token: string): Promise<any> {
  const payload = await jwtService.verifyAccessToken(token)
  // Back-compat: some callers expect a single role string
  const role = payload.roles?.includes('ADMIN') ? 'ADMIN' : 'USER'
  return { ...payload, role }
}

