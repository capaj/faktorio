import { initTRPC } from '@trpc/server'
import { LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from './schema'

export type TrpcContext = {
	db: LibSQLDatabase<typeof schema>
	userId: string | undefined
	sessionId: string | undefined
}

export const trpcContext = initTRPC.context<TrpcContext>().create()
