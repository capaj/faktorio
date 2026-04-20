import { TRPCLink, loggerLink } from '@trpc/client'
import { observable } from '@trpc/server/observable'

import { toast } from 'sonner'
import { AppRouter } from 'faktorio-api/src/trpcRouter'

let unauthorizedHandled = false

/**
 * Logs the user out when the server returns 401 / UNAUTHORIZED for an
 * authenticated request. Swallows the error so downstream links (e.g. the
 * toast link) don't surface it — the full-page redirect replaces the UI.
 */
export const unauthorizedLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        error(err) {
          const isUnauthorized =
            err.data?.code === 'UNAUTHORIZED' || err.data?.httpStatus === 401
          const hadToken = localStorage.getItem('auth_token')

          if (isUnauthorized && hadToken) {
            if (!unauthorizedHandled) {
              unauthorizedHandled = true
              localStorage.removeItem('auth_token')
              localStorage.removeItem('auth_user')
              toast.error('Session expired. Please log in again.')
              if (window.location.pathname !== '/login') {
                window.location.href = '/login'
              }
            }
            return
          }

          observer.error(err)
        },
        next(value) {
          observer.next(value)
        },
        complete() {
          observer.complete()
        }
      })
      return unsubscribe
    })
  }
}

/**
 * this displays a toast every time a mutation/query fails
 */
export const errorToastLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        error(err) {
          let message
          try {
            const parsedError = JSON.parse(err.message)
            if (Array.isArray(parsedError) && parsedError.length > 0) {
              const customErrors = []
              for (const error of parsedError) {
                if (error['code'] === 'custom') {
                  customErrors.push(error)
                }
              }

              if (customErrors.length) {
                message = customErrors[0].message
              } else {
                message = parsedError[0].message
              }
            }
          } catch (e) {
            // we do not need to handle the case where JSON parsing fails. err.message does not need to be JSON
          }

          toast.error(
            err.name === 'TRPCClientError'
              ? err.message
              : (err.name ?? 'An error occurred.')
          )

          observer.error(err)
        },
        next(value) {
          observer.next(value)
        },
        complete() {
          observer.complete()
        }
      })
      return unsubscribe
    })
  }
}

export const trpcLinks: TRPCLink<any>[] = [
  errorToastLink,
  unauthorizedLink,
  loggerLink({
    enabled: (opts) =>
      process.env.NODE_ENV === 'development' ||
      (process.env.NODE_ENV == 'dev' && typeof window !== 'undefined') ||
      (opts.direction === 'down' && opts.result instanceof Error)
  })
]
