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
      user: ctx.user
    }
  })
})

export const protectedProc = tc.procedure
  .use(loggerMiddleware)
  .use(isAuthorizedMiddleware)
