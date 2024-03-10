import { z } from 'zod';
import { invoicesTb } from '../schema';
import { trpcContext } from '../trpcContext';
import { eq } from 'drizzle-orm';
import { protectedProc } from '../isAuthorizedMiddleware';

export const invoiceRouter = trpcContext.router({
	create: protectedProc
		.input(z.object({ title: z.string() }))
		.mutation(({ input }) => {
			return new Date();
		}),
	all: protectedProc.query(async ({ ctx }) => {
		const invoicesForUser = await ctx.db.query.invoicesTb.findMany({
			where: eq(invoicesTb.userId, ctx.userId)
		});

		return invoicesForUser;
	})
});
