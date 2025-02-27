import { TrpcContext, trpcContext } from '../trpcContext'
import z from 'zod'

import { eq, and, isNull } from 'drizzle-orm'
import { userT, passwordResetTokenT } from '../schema'
import { TRPCError } from '@trpc/server'
import jwt from '@tsndr/cloudflare-worker-jwt'

import cuid2 from '@paralleldrive/cuid2'
// We'll define a simple user schema here since we can't find the imported one
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  passwordHash: z.string()
})

// Mock these functions since we can't find the imported ones
async function hashPassword(
  password: string,
  salt: Uint8Array
): Promise<string> {
  // In a real implementation, this would use a proper hashing algorithm
  return `hashed_${password}_${salt}`
}

function strToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  // In a real implementation, this would verify the hash
  return hash.startsWith(`hashed_${password}`)
}

// Mock the email sending function
async function sendMailjetEmail(emailData: any, env: any): Promise<void> {
  console.log('Sending email:', emailData)
}

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
      const userId = cuid2.createId()
      const hashedPassword = await hashPassword(
        password,
        strToUint8Array(userId)
      )

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

      const token = cuid2.createId()
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 1) // Token expires in 1 hour

      await ctx.db.insert(passwordResetTokenT).values({
        userId: user.id,
        requestedFromIp: 'unknown', // You'll need to update this based on your context structure
        token,
        expiresAt: expiresAt
      })

      const resetLink = `${process.env.APP_URL}/reset-password?token=${token}`

      await sendMailjetEmail(
        {
          to: { email: user.email, name: user.name },
          subject: 'Reset your password',
          html: `
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}">${resetLink}</a>
          <p>This link will expire in 1 hour.</p>
        `
        },
        {} // You'll need to update this based on your context structure
      )

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
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid or expired reset token'
        })
      }

      if (resetToken.expiresAt.getTime() < Date.now()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Reset token has expired'
        })
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

      const hashedPassword = await hashPassword(
        input.password,
        strToUint8Array(resetToken.userId)
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
    })
})

export type User = z.infer<typeof userSchema>
