import {
  createTRPCReact,
  inferReactQueryProcedureOptions,
  type CreateTRPCReact
} from '@trpc/react-query'

import { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import { AppRouter } from 'faktorio-api/src/trpcRouter'

export type ReactQueryOptions = inferReactQueryProcedureOptions<AppRouter>
export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>

export const trpcClient: CreateTRPCReact<AppRouter, unknown> =
  createTRPCReact<AppRouter>()
