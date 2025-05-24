import { TRPCLink } from '@trpc/client'
import { observable } from '@trpc/server/observable'
import { TRPCResponseMessage } from '@trpc/server/unstable-core-do-not-import'
import { LocalCallerLinkOptions, createCaller } from './AuthContext'
import { AppRouter } from 'faktorio-api/src/trpcRouter'

/**
 * Creates a tRPC link that executes procedures locally using the router's createCaller.
 */
export function createLocalCallerLink<TRouter extends AppRouter>(
  opts: LocalCallerLinkOptions<TRouter>
): TRPCLink<TRouter> {
  return () => {
    // This function is called for each operation
    return ({ op }) => {
      // Returns an observable for the operation result
      return observable((observer) => {
        const { path, input, type, id } = op

        // Asynchronously create the context, then the caller
        Promise.resolve(opts.createContext())
          .then((ctx) => {
            // Create the caller with the resolved context
            const caller = createCaller(ctx)
            // Dynamically access the procedure function on the caller
            const procedureFn = path
              .split('.')
              .reduce(
                (obj, key) => obj?.[key as keyof typeof obj],
                caller as any
              )

            if (typeof procedureFn !== 'function') {
              throw new Error(`Procedure not found at path: ${path}`)
            }

            // Execute the procedure
            return procedureFn(input)
          })
          .then((data) => {
            // Successfully executed
            const response: TRPCResponseMessage = {
              id,
              result: {
                type: 'data',
                data
              }
            }

            if (type === 'mutation') {
              opts.onMutation(op)
            }
            console.debug(response)
            observer.next(response)
            observer.complete()
          })
          .catch((cause) => {
            // Handle errors
            console.error(cause)
            observer.error(cause)
          })

        // No cleanup needed for simple caller execution
        return () => {}
      })
    }
  }
}
