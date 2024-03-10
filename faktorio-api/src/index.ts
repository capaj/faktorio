export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import { drizzle } from 'drizzle-orm/libsql'
import { appRouter } from './trpcRouter'
import { LibSQLDatabase } from 'drizzle-orm/libsql'
import { Client, createClient } from '@libsql/client'
import jwt, { type JwtPayload } from '@tsndr/cloudflare-worker-jwt'
import { jwtVerify, importSPKI } from 'jose'
import * as schema from './schema'
import colorize from '@pinojs/json-colorizer'
import { TrpcContext } from './trpcContext'

export interface Env {
	TURSO_DATABASE_URL: string
	TURSO_AUTH_TOKEN: string
	CLERK_SECRET_KEY: string
}



// async function injectDB(request: RequestWithDb, env: Env) {
//   const turso = createClient({
//     url: env.TURSO_DATABASE_URL!,
//     authToken: env.TURSO_AUTH_TOKEN
//   })
//   request.dbClient = turso
// 	request.db = drizzle(turso)

// 	return turso
// }
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
	'Access-Control-Max-Age': '86400',
}

async function handleOptions(request: Request) {
	if (
		request.headers.get('Origin') !== null &&
		request.headers.get('Access-Control-Request-Method') !== null &&
		request.headers.get('Access-Control-Request-Headers') !== null
	) {
		// Handle CORS preflight requests.
		return new Response(null, {
			// @ts-expect-error
			headers: {
				...corsHeaders,
				'Access-Control-Allow-Headers': request.headers.get(
					'Access-Control-Request-Headers',
				),
			},
		})
	} else {
		// Handle standard OPTIONS request.
		return new Response(null, {
			headers: {
				Allow: 'GET, HEAD, POST, OPTIONS',
			},
		})
	}
}

const publicKeyPEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0aB2UX8USw+6f+eVO+ut
TD/fFXKg3SQ/Yte6O0FUcyfpnDpFHWKD324BptsO56d3wOJgStg8t2rCSijuMDpz
JpgXqA7IUw4wa8510k9c6hziG26ZW8nn1ywNELYfYWf0M+8siiwY7H79FNW8WeQ0
3Ny2ylFfOevsy/wbK6P0iMJmxJ1x+qjRDvPW8s4k/q5haX7W+iam+nTyBetDvzBB
YP2wCVnoJKc8xPRcgSLVpnMuHJ9vJ6GTauUqCekGP8l8EvVVIuIqjf0x1NaazGwi
NJCZbjlROUAYbfrqqhLGexChVclm8oQG6Zh9c25dY/pIhH4NMb9T347Ovu/IBHkN
4wIDAQAB
-----END PUBLIC KEY-----`

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return handleOptions(request)
		}

		const turso = createClient({
			url: env.TURSO_DATABASE_URL!,
			authToken: env.TURSO_AUTH_TOKEN,
		})

		const createTrpcContext = async () => {
			const publicKey = await importSPKI(publicKeyPEM, 'RS256')

			const authHeader = request.headers.get('Authorization')

			let jwtPayload
			if (authHeader) {
				const token = authHeader.split(' ')[1]

				jwtPayload = await jwtVerify(token, publicKey, {
					algorithms: ['RS256'],
				})

			}
			return {
				db: drizzle(turso, {schema}),
				userId: jwtPayload?.payload.sub,
				sessionId: jwtPayload?.payload.sid as string,
			}
		}

		return fetchRequestHandler({
			endpoint: '/trpc',
			responseMeta: () => {
				return {
					headers: {
						...corsHeaders,
					},
				}
			},
			onError: (errCtx: any) => {
				const { path, input, ctx, type } = errCtx as {
					error: any
					type: string
					path: string
					input: any
					ctx: TrpcContext
					req: any
				}
				console.error(`${type} ${path} failed for:`)
				console.error(
					colorize(
						// @ts-expect-error types in colorize are wrong, it can accept anything same as console.log
						{ input, ctxUser: ctx.user },
						{ pretty: ecsMetadataUri ? false : true }
					)
				)
			},
			req: request,
			router: appRouter,
			createContext: createTrpcContext,
		})
	},
}
