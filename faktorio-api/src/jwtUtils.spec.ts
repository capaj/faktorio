import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  verifyAndDecodeToken,
  extractUserFromAuthHeader,
  generateToken,
  JWT_EXPIRATION
} from './jwtUtils'
import jwt, { type JwtPayload } from '@tsndr/cloudflare-worker-jwt'

describe('JWT Utilities', () => {
  const mockSecret = 'test-secret'
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashed-password',
    googleId: 'google-id-123',
    pictureUrl: null,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  }

  // Define the expected payload type
  type UserPayload = JwtPayload & {
    payload: {
      user: typeof mockUser
      exp?: number
    }
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('verifyAndDecodeToken', () => {
    it('should return decoded payload when token is valid', async () => {
      // Generate a real token with the user directly in the payload
      const token = await jwt.sign({ user: mockUser }, mockSecret)

      const result = await verifyAndDecodeToken(token, mockSecret)

      expect(result).toBeTruthy()
      expect(result?.payload).toHaveProperty('user')
      expect(result?.payload.user).toHaveProperty('id', '123')
      expect(result?.payload.user).toHaveProperty('email', 'test@example.com')
      expect(result?.payload.user).toHaveProperty('name', 'Test User')
    })

    it('should return null when token verification fails', async () => {
      // Generate a token with a different secret
      const token = await jwt.sign({ user: mockUser }, 'different-secret')

      const result = await verifyAndDecodeToken(token, mockSecret)

      expect(result).toBeNull()
    })

    it('should return null when exception occurs', async () => {
      const invalidToken = 'not.a.valid.token'
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await verifyAndDecodeToken(invalidToken, mockSecret)

      expect(consoleSpy).toHaveBeenCalled()
      expect(result).toBeNull()
    })
  })

  describe('extractUserFromAuthHeader', () => {
    it('should return undefined when auth header is null', async () => {
      const result = await extractUserFromAuthHeader(null, mockSecret)
      expect(result).toBeUndefined()
    })

    it('should extract and return user from valid auth header', async () => {
      // Generate a real token with user directly in the payload
      const token = await jwt.sign({ user: mockUser }, mockSecret)
      const mockAuthHeader = `Bearer ${token}`

      const result = await extractUserFromAuthHeader(mockAuthHeader, mockSecret)

      expect(result).toBeTruthy()
      expect(result).toHaveProperty('id', '123')
      expect(result).toHaveProperty('email', 'test@example.com')
      expect(result).toHaveProperty('name', 'Test User')
    })

    it('should return undefined when token is invalid', async () => {
      // Generate a token with a different secret
      const token = await jwt.sign({ user: mockUser }, 'different-secret')
      const mockAuthHeader = `Bearer ${token}`

      const result = await extractUserFromAuthHeader(mockAuthHeader, mockSecret)

      expect(result).toBeUndefined()
    })
  })

  describe('generateToken', () => {
    it('should generate a token with correct payload and expiration', async () => {
      const now = 1609459200000 // 2021-01-01 in milliseconds
      vi.spyOn(Date, 'now').mockReturnValue(now)

      const token = await generateToken(mockUser, mockSecret)

      // Verify the token is valid and decode it
      const isVerified = await jwt.verify(token, mockSecret)

      // Decode and check contents
      const decoded = jwt.decode(token) as UserPayload

      expect(decoded.payload.user).toHaveProperty('id', '123')
      expect(decoded.payload.user).toHaveProperty('email', 'test@example.com')
      expect(decoded.payload.user).not.toHaveProperty('passwordHash')
      expect(decoded.payload.user).not.toHaveProperty('googleId')
      expect(decoded.payload.exp).toBe(Math.floor(now / 1000) + JWT_EXPIRATION)
    })

    it('should remove sensitive fields from user payload', async () => {
      // Use a fixed timestamp for consistent testing
      const now = 1609459200000 // 2021-01-01 in milliseconds
      vi.spyOn(Date, 'now').mockReturnValue(now)

      const token = await generateToken(mockUser, mockSecret)

      // Decode and check contents
      const decoded = jwt.decode(token) as UserPayload

      expect(decoded.payload.user).not.toHaveProperty('passwordHash')
      expect(decoded.payload.user).not.toHaveProperty('googleId')
      expect(decoded.payload.user).toHaveProperty('id', '123')
      expect(decoded.payload.user).toHaveProperty('email', 'test@example.com')
      expect(decoded.payload.user).toHaveProperty('name', 'Test User')

      // Verify the expiration time
      expect(decoded.payload.exp).toBe(1609459200 + JWT_EXPIRATION)
    })
  })
})
