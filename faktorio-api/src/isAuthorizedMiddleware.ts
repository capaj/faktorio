import { TRPCError } from '@trpc/server'
import { loggerMiddleware } from './loggerMiddleware'
import { trpcContext } from './trpcContext'

const isAuthorizedMiddleware = trpcContext.middleware(async ({ ctx, next }) => {
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

export const protectedProc = trpcContext.procedure
  .use(loggerMiddleware)
  .use(isAuthorizedMiddleware)
