import {
  createTRPCReact,
  inferReactQueryProcedureOptions
} from '@trpc/react-query'

import { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import { AppRouter } from '../../../faktorio-api/src/trpcRouter'

export type ReactQueryOptions = inferReactQueryProcedureOptions<AppRouter>
export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>

export const trpcClient = createTRPCReact<AppRouter>()
