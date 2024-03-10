import { trpcContext } from './trpcContext'

export const loggerMiddleware = trpcContext.middleware(
	async ({ path, type, next }) => {
		const start = Date.now()
		const result = await next()
		const durationMs = Date.now() - start

		console.log(`${type} ${path} ${durationMs + 'ms'}`)
		return result
	},
)
