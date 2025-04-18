import { TRPCLink } from '@trpc/client'
import { AnyRouter } from '@trpc/server'
import { observable } from '@trpc/server/observable'
import { TRPCResponseMessage } from '@trpc/server/unstable-core-do-not-import'
import { LocalCallerLinkOptions, createCaller } from './AuthContext'

/**
 * Creates a tRPC link that executes procedures locally using the router's createCaller.
 */
export function createLocalCallerLink<TRouter extends AnyRouter>(
  opts: LocalCallerLinkOptions<TRouter>
): TRPCLink<TRouter> {
  return () => {
    // @ts-expect-error
    const caller = createCaller(opts.createContext())
    // This function is called for each operation
    return ({ op }) => {
      // Returns an observable for the operation result
      return observable((observer) => {
        const { path, input, type, id } = op

        console.log(op)

        // Asynchronously create the context, then the caller
        Promise.resolve(opts.createContext())
          .then((ctx) => {
            // Use the official createCaller method from the router
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
            const response: TRPCResponseMessage = {
              id,
              error: {
                code: -32603, // Internal error code
                message: cause instanceof Error ? cause.message : String(cause),
                data: {
                  code: 'INTERNAL_SERVER_ERROR',
                  httpStatus: 500,
                  stack: cause instanceof Error ? cause.stack : undefined,
                  path,
                  input,
                  type
                }
              }
            }
            // @ts-expect-error
            observer.next(response)
            observer.complete()
          })

        // No cleanup needed for simple caller execution
        return () => {}
      })
    }
  }
}
