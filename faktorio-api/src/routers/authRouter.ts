import { trpcContext } from '../trpcContext'
import z from 'zod/v4'

import { eq, and, isNull } from 'drizzle-orm'
import { userT, passwordResetTokenT } from 'faktorio-db/schema'
import { TRPCError } from '@trpc/server'
import jwt from '@tsndr/cloudflare-worker-jwt'

import { createId } from '@paralleldrive/cuid2'
import { protectedProc } from '../isAuthorizedMiddleware'
import { verifyPassword, hashPassword } from '../lib/crypto'
import { sendEmail } from '../sendEmail'

// We'll define a simple user schema here since we can't find the imported one
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  passwordHash: z.string()
})

export const logoutUser = async () => {
  // With JWT, we don't need server-side logout
  // The client should simply remove the token from storage
  return
}

// Function to verify Google token
async function verifyGoogleToken(token: string): Promise<{
  email: string
  name: string
  picture: string
  sub: string
} | null> {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
    )

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error verifying Google token:', error)
    return null
  }
}

export const authRouter = trpcContext.router({
  login: trpcContext.procedure
    .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input

      // Find user
      const user = await ctx.db.query.userT.findFirst({
        where: eq(userT.email, email)
      })
      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials'
        })
      }

      if (!user.passwordHash) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Cannot login with credentials'
        })
      }

      // Check password
      const passwordMatch = await verifyPassword(user.passwordHash, password)
      if (!passwordMatch) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials'
        })
      }

      // Generate JWT token
      const token = await ctx.generateToken(user)

      return {
        user,
        token
      }
    }),
  logout: trpcContext.procedure.mutation(({ ctx }) => {
    console.log(`logout ${ctx.user?.id}`)
    // todo: invalidate token when we have upstash
    return { success: true }
  }),
  signup: trpcContext.procedure
    .input(
      z.object({
        email: z.string().email(),
        fullName: z.string().min(2),
        password: z.string().min(6)
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input

      const existing = await ctx.db.query.userT.findFirst({
        where: eq(userT.email, email)
      })
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `User ${email} already exists`
        })
      }
      const userId = createId()
      // Pass only the password, bcrypt handles salt
      const hashedPassword = await hashPassword(password)

      const [user] = await ctx.db
        .insert(userT)
        .values({
          id: userId,
          name: input.fullName,
          email,
          passwordHash: hashedPassword
        })
        .returning()

      // Generate JWT token
      const token = await ctx.generateToken(user)

      return {
        user,
        token
      }
    }),
  googleLogin: trpcContext.procedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const googleUser = await verifyGoogleToken(input.token)

      if (!googleUser) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid Google token'
        })
      }

      // Check if user exists with this Google ID
      let user = await ctx.db.query.userT.findFirst({
        where: eq(userT.googleId, googleUser.sub)
      })

      // If not found by Google ID, try to find by email
      if (!user) {
        user = await ctx.db.query.userT.findFirst({
          where: eq(userT.email, googleUser.email)
        })

        // If user exists with this email but no Google ID, update the user with Google ID
        if (user) {
          ;[user] = await ctx.db
            .update(userT)
            .set({
              googleId: googleUser.sub,
              pictureUrl: googleUser.picture || user.pictureUrl || null
            })
            .where(eq(userT.id, user.id))
            .returning()
        }
      }

      // If user doesn't exist at all, create a new one
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found. Please sign up with Google first.'
        })
      }

      // Generate JWT token
      const token = await ctx.generateToken(user)

      return {
        user,
        token
      }
    }),
  googleSignup: trpcContext.procedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const googleUser = await verifyGoogleToken(input.token)

      if (!googleUser) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid Google token'
        })
      }

      // Check if user already exists
      const existingUser = await ctx.db.query.userT.findFirst({
        where: eq(userT.email, googleUser.email)
      })

      if (existingUser) {
        // If user exists but doesn't have Google ID, update it
        if (!existingUser.googleId) {
          const [updatedUser] = await ctx.db
            .update(userT)
            .set({
              googleId: googleUser.sub,
              pictureUrl: googleUser.picture || existingUser.pictureUrl
            })
            .where(eq(userT.id, existingUser.id))
            .returning()

          const token = await ctx.generateToken(updatedUser)

          return {
            user: updatedUser,
            token
          }
        }

        // If user already exists with Google ID
        throw new TRPCError({
          code: 'CONFLICT',
          message: `User with email ${googleUser.email} already exists`
        })
      }

      const [user] = await ctx.db
        .insert(userT)
        .values({
          name: googleUser.name,
          email: googleUser.email,
          passwordHash: null,
          googleId: googleUser.sub,
          pictureUrl: googleUser.picture
        })
        .returning()

      // Generate JWT token
      const token = await ctx.generateToken(user)

      return {
        user,
        token
      }
    }),
  verifyToken: trpcContext.procedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const result = await jwt.verify(input.token, ctx.env.JWT_SECRET)
        return { valid: !!result }
      } catch (error) {
        return { valid: false }
      }
    }),
  resetPassword: trpcContext.procedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.db.query.userT.findFirst({
        where: eq(userT.email, input.email)
      })

      if (!user) {
        // Return success even if user doesn't exist to prevent email enumeration
        return { success: true }
      }

      const token = createId()
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 1) // Token expires in 1 hour
      const requestedFromIp =
        ctx.req.headers.get('x-forwarded-for') || 'unknown'

      await ctx.db.insert(passwordResetTokenT).values({
        userId: user.id,
        requestedFromIp,
        token,
        expiresAt: expiresAt
      })
      let reqDomain = ctx.req.headers.get('host')
      let protocol = ctx.req.headers.get('x-forwarded-proto') || 'https'

      if (reqDomain?.startsWith('localhost')) {
        reqDomain = 'localhost:5173' // default port for dev
        protocol = 'http'
      } else if (reqDomain === 'faktorio-api.capaj.workers.dev') {
        reqDomain = 'faktorio.cz' // production domain
      }
      const resetLink = `${protocol}://${reqDomain}/reset-password?token=${token}`

      await ctx.sendEmail({
        to: { email: user.email, name: user.name },
        subject: 'Obnovení hesla',
        html: `
          <p>Klikněte na odkaz níže pro obnovení hesla:</p>
          <a href="${resetLink}">${resetLink}</a>
          <p>Platnost tohoto odkazu vyprší za 1 hodinu.</p>
          <p>Pokud jste tento email nevyžádali, ignorujte jej.</p>
        `
      })

      return { success: true }
    }),

  verifyResetToken: trpcContext.procedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input, ctx }) => {
      const resetToken = await ctx.db.query.passwordResetTokenT.findFirst({
        where: and(
          eq(passwordResetTokenT.token, input.token),
          isNull(passwordResetTokenT.usedAt)
        )
      })

      if (!resetToken) {
        return { valid: false }
      }

      if (resetToken.expiresAt.getTime() < Date.now()) {
        return { valid: false }
      }

      return { valid: true }
    }),

  setNewPassword: trpcContext.procedure
    .input(
      z.object({
        token: z.string(),
        password: z.string().min(6)
      })
    )
    .mutation(async ({ input, ctx }) => {
      const resetToken = await ctx.db.query.passwordResetTokenT.findFirst({
        where: and(
          eq(passwordResetTokenT.token, input.token),
          isNull(passwordResetTokenT.usedAt)
        )
      })

      if (!resetToken || resetToken.expiresAt.getTime() < Date.now()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid or expired reset token'
        })
      }

      // Pass only the password, bcrypt handles salt
      const hashedPassword = await hashPassword(
        input.password,
        new Uint8Array(Buffer.from(resetToken.userId))
      )

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(userT)
          .set({ passwordHash: hashedPassword })
          .where(eq(userT.id, resetToken.userId))

        await tx
          .update(passwordResetTokenT)
          .set({ usedAt: new Date() })
          .where(eq(passwordResetTokenT.id, resetToken.id))
      })

      return { success: true }
    }),
  changePassword: trpcContext.procedure
    .input(
      z.object({
        currentPassword: z.string().min(6),
        newPassword: z.string().min(6)
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to change your password'
        })
      }

      // Check if user has a password (might be using Google auth)
      const user = await ctx.db.query.userT.findFirst({
        where: eq(userT.id, ctx.user.id)
      })

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Cannot change password for accounts without password authentication'
        })
      }

      // Verify current password
      const passwordMatch = await verifyPassword(
        user.passwordHash,
        input.currentPassword
      )
      if (!passwordMatch) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Current password is incorrect'
        })
      }

      // Hash new password
      // Pass only the password, bcrypt handles salt
      const hashedPassword = await hashPassword(input.newPassword)

      // Update password
      await ctx.db
        .update(userT)
        .set({ passwordHash: hashedPassword })
        .where(eq(userT.id, user.id))

      return { success: true }
    }),
  changeEmail: protectedProc
    .input(
      z.object({
        currentPassword: z.string().min(6),
        newEmail: z.string().email()
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to change your email'
        })
      }
      let user = await ctx.db.query.userT.findFirst({
        where: eq(userT.id, ctx.user.id)
      })

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Cannot change email for accounts without password authentication'
        })
      }

      // Verify current password
      const passwordMatch = await verifyPassword(
        user.passwordHash,
        input.currentPassword
      )
      if (!passwordMatch) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Current password is incorrect'
        })
      }

      let updatedUser
      await ctx.db.transaction(async (tx) => {
        const existingUser = await tx.query.userT.findFirst({
          where: eq(userT.email, input.newEmail)
        })

        if (existingUser && existingUser.id !== ctx.user.id) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This email is already in use'
          })
        }

        ;[user] = await tx
          .update(userT)
          .set({ email: input.newEmail })
          .where(eq(userT.id, ctx.user!.id))
          .returning()

        updatedUser = user
      })

      if (!updatedUser) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update email'
        })
      }

      // Generate new JWT token with updated user info
      const token = await ctx.generateToken(updatedUser)

      return {
        success: true,
        user: updatedUser,
        token
      }
    }),
  deleteAccount: protectedProc
    .input(
      z.object({
        password: z.string().optional(),
        confirmText: z.string().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to delete your account'
        })
      }

      // Get user with password hash
      const user = await ctx.db.query.userT.findFirst({
        where: eq(userT.id, ctx.user.id)
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        })
      }

      // If user has password authentication, verify password
      if (user.passwordHash) {
        if (!input.password) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Password is required'
          })
        }

        const passwordMatch = await verifyPassword(
          user.passwordHash,
          input.password
        )
        if (!passwordMatch) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Password is incorrect'
          })
        }
      } else {
        // For users without password (e.g., social login), verify confirmation text
        if (!input.confirmText || input.confirmText.toLowerCase() !== 'ano') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Pro potvrzení je nutné zadat "ano"'
          })
        }
      }

      // Delete the user
      await ctx.db.delete(userT).where(eq(userT.id, ctx.user.id))

      return { success: true }
    })
})

export type User = z.infer<typeof userSchema>
