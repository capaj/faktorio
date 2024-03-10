import { z } from 'zod';
import { contactTb } from '../schema';
import { trpcContext } from '../trpcContext';
import { eq } from 'drizzle-orm';
import { contactCreateFormSchema } from './contactCreateFormSchema';
import { protectedProc } from '../isAuthorizedMiddleware';

export const contactRouter = trpcContext.router({
	all: protectedProc
		.input(z.string().nullish())
		.query(async ({ input, ctx }) => {
			return await ctx.db.query.contactTb.findMany({
				where: eq(contactTb.user_id, ctx.userId)
			});
		}),
	create: protectedProc
		.input(contactCreateFormSchema)
		.mutation(async ({ input, ctx }) => {
			const contact = await ctx.db.insert(contactTb).values({
				...input,
				user_id: ctx.userId
			}).execute();

			return contact;
		})
});
