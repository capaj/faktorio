
import { trpcContext } from './trpcContext'
import { invoiceRouter } from './routers/invoiceRouter'
import { contactRouter } from './routers/contactRouter'

export const appRouter = trpcContext.router({
	invoices: invoiceRouter,
	contacts: contactRouter
})

export type AppRouter = typeof appRouter
