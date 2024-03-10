import { TRPCError, inferAsyncReturnType } from '@trpc/server'

import { z } from 'zod'
import { invoices } from './schema'
import { loggerMiddleware } from './loggerMiddleware'
import { trpcContext } from './trpcContext'

const isAuthorizedMiddleware = trpcContext.middleware(async ({ ctx, next }) => {
	if (!ctx.userId) {
		throw new TRPCError({
			code: 'UNAUTHORIZED',
			message: 'Not authorized',
		})
	}
	return next()
})

const protectedProc = trpcContext.procedure
	.use(loggerMiddleware)
	.use(isAuthorizedMiddleware)

const invoiceRouter = trpcContext.router({
	hello: protectedProc
		.input(z.object({ title: z.string() }))
		.mutation(({ input }) => {
			return new Date()
		}),
	world: protectedProc.query(async ({ ctx }) => {
		console.log('aaa')
		console.log(await ctx.db.select().from(invoices))

		return [
			{
				title: 'hel22lo',
				createdAt: new Date(),
			},
		]
	}),
})

export const appRouter = trpcContext.router({
	post: invoiceRouter,
	hello: protectedProc
		.input(z.string().nullish())
		.query(async ({ input, ctx }) => {
			const invoicesForUser = await ctx.db.select().from(invoices).execute()
			console.log(invoicesForUser)
			console.log(ctx)
			return invoicesForUser
		}),
})

export type AppRouter = typeof appRouter
