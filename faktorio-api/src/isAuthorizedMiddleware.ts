import { TRPCError } from '@trpc/server'
import { loggerMiddleware } from './loggerMiddleware'
import { tc } from './trpcContext'

const isAuthorizedMiddleware = tc.middleware(async ({ ctx, next }) => {
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

export const protectedProc = tc.procedure
  .use(loggerMiddleware)
  .use(isAuthorizedMiddleware)
