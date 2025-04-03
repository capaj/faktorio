import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './crypto'

describe('Password hashing and verification functions', () => {
  describe('hashPassword', () => {
    it('should generate different hashes for different passwords with same salt', async () => {
      const password1 = 'SecurePassword123'
      const password2 = 'DifferentPassword456'

      const hash1 = await hashPassword(password1)
      const hash2 = await hashPassword(password2)

      expect(hash1).not.toBe(hash2)
    })

    it('should generate different hashes for the same password when called multiple times (due to salting)', async () => {
      const password = 'SecurePassword123'

      // Hash the same password twice
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyPassword', () => {
    it('should return true when password matches hash', async () => {
      const password = 'SecurePassword123'
      // Salt is handled internally by bcrypt-edge

      const hashedPassword = await hashPassword(password)
      const result = await verifyPassword(hashedPassword, password)

      expect(result).toBe(true)
    })

    it('should return false when password does not match hash', async () => {
      const password = 'SecurePassword123'
      const wrongPassword = 'WrongPassword123'
      // Salt is handled internally by bcrypt-edge

      const hashedPassword = await hashPassword(password)
      const result = await verifyPassword(hashedPassword, wrongPassword)

      expect(result).toBe(false)
    })

    it('should return false when hash is invalid', async () => {
      const password = 'SecurePassword123'
      const invalidHash = 'not-a-valid-hash-format'

      const result = await verifyPassword(invalidHash, password)

      expect(result).toBe(false)
    })
  })

  describe('hashPassword and verifyPassword workflow', () => {
    it('should create a verifiable hash from a password', async () => {
      const password = 'SecurePassword123'
      // Salt is handled internally by bcrypt-edge

      // Hash the password
      const hashedPassword = await hashPassword(password)

      // Verify with correct password
      const isValid = await verifyPassword(hashedPassword, password)
      expect(isValid).toBe(true)

      // Verify with incorrect password
      const isInvalid = await verifyPassword(hashedPassword, 'WrongPassword')
      expect(isInvalid).toBe(false)
    })

    it('should handle different users (potentially with same password) correctly', async () => {
      // User 1
      const password1 = 'Password123'
      const hash1 = await hashPassword(password1)

      // User 2
      const password2 = 'Password123' // Same password as user 1
      const hash2 = await hashPassword(password2)

      // Hashes should be different even with the same password
      expect(hash1).not.toBe(hash2)

      // Each user should be able to verify with their password
      expect(await verifyPassword(hash1, password1)).toBe(true)
      expect(await verifyPassword(hash2, password2)).toBe(true)

      // User 1's hash should verify with User 1's password
      expect(await verifyPassword(hash1, password1)).toBe(true)
      // User 2's hash should verify with User 2's password
      expect(await verifyPassword(hash2, password2)).toBe(true)

      // User 1's hash should *not* verify with a different password
      expect(await verifyPassword(hash1, 'WrongPassword')).toBe(false)
      // User 2's hash should *not* verify with a different password
      expect(await verifyPassword(hash2, 'AnotherWrongPassword')).toBe(false)

      // Different passwords definitely shouldn't verify
    })
  })
})
