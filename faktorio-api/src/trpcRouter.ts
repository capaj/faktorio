import { TRPCError, inferAsyncReturnType } from '@trpc/server'

import { z } from 'zod'
import { contactTb, invoicesTb } from './schema'
import { loggerMiddleware } from './loggerMiddleware'
import { trpcContext } from './trpcContext'
import { eq } from 'drizzle-orm'
import { contactInsertSchema } from './zodDbSchemas'

const isAuthorizedMiddleware = trpcContext.middleware(async ({ ctx, next }) => {
	if (!ctx.userId) {
		throw new TRPCError({
			code: 'UNAUTHORIZED',
			message: 'Not authorized'
		})
	}
	return next({
		ctx: {
			userId: ctx.userId as string
		}
	})
})

const protectedProc = trpcContext.procedure
	.use(loggerMiddleware)
	.use(isAuthorizedMiddleware)

const invoiceRouter = trpcContext.router({
	create: protectedProc
		.input(z.object({ title: z.string() }))
		.mutation(({ input }) => {
			return new Date()
		}),
	all: protectedProc.query(async ({ ctx }) => {
		const invoicesForUser = await ctx.db.query.invoicesTb.findMany({
			where: eq(invoicesTb.userId, ctx.userId)
		})

		return invoicesForUser
	})
})

const contactRouter = trpcContext.router({
	all: protectedProc
		.input(z.string().nullish())
		.query(async ({ input, ctx }) => {
			return await ctx.db.query.contactTb.findMany({
				where: eq(contactTb.user_id, ctx.userId)
			})
		}),
	create: protectedProc
		.input(contactInsertSchema)
		.mutation(async ({ input, ctx }) => {
			const contact = await ctx.db.insert(contactTb).values(input).execute()

			return contact
		})
})

export const appRouter = trpcContext.router({
	invoices: invoiceRouter,
	contacts: contactRouter
})

export type AppRouter = typeof appRouter
