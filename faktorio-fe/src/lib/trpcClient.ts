import {
  createTRPCClient,
  createTRPCReact,
  inferReactQueryProcedureOptions,
  type CreateTRPCReact
} from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import SuperJSON from 'superjson'
import { authHeaders } from './AuthContext'

import { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import { AppRouter } from 'faktorio-api/src/trpcRouter'

export type ReactQueryOptions = inferReactQueryProcedureOptions<AppRouter>
export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>

const VITE_API_URL = import.meta.env.VITE_API_URL

export const trpcClient: CreateTRPCReact<AppRouter, unknown> =
  createTRPCReact<AppRouter>()

// Vanilla tRPC client for use outside React components
export const vanillaTrpcClient: ReturnType<typeof createTRPCClient<AppRouter>> = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      transformer: SuperJSON,
      url: VITE_API_URL,
      headers: authHeaders
    })
  ]
})

