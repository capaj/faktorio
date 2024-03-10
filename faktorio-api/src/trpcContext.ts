import { initTRPC } from '@trpc/server'
import { LibSQLDatabase } from 'drizzle-orm/libsql'

export type TrpcContext = {
	db: LibSQLDatabase
	userId: string | undefined
	sessionId: string | undefined
}

export const trpcContext = initTRPC.context<TrpcContext>().create()
