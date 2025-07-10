import jwt, { type JwtPayload } from '@tsndr/cloudflare-worker-jwt'
import { userT } from 'faktorio-db/schema'

// Token expiration time in seconds (1 year)
export const JWT_EXPIRATION = 60 * 60 * 24 * 365

export async function verifyAndDecodeToken(
  token: string,
  secret: string
): Promise<JwtPayload | null> {
  try {
    const isValid = await jwt.verify(token, secret)
    if (isValid) {
      return jwt.decode(token) as JwtPayload
    }
  } catch (error) {
    console.error(error)
  }
  return null
}

export async function extractUserFromAuthHeader(
  authHeader: string | null,
  jwtSecret: string
) {
  if (!authHeader) return undefined

  const token = authHeader.split(' ')[1]
  const jwtPayload = await verifyAndDecodeToken(token, jwtSecret)

  return jwtPayload?.payload?.user as typeof userT.$inferSelect | undefined
}

export async function generateToken(
  user: typeof userT.$inferSelect,
  jwtSecret: string
): Promise<string> {
  const payload = {
    ...user,
    passwordHash: undefined,
    googleId: undefined
  }

  return await jwt.sign(
    {
      user: payload,
      exp: Math.floor(Date.now() / 1000) + JWT_EXPIRATION
    },
    jwtSecret
  )
}
