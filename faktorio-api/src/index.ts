import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import { drizzle } from 'drizzle-orm/libsql'
import { appRouter } from './trpcRouter'

import { createClient } from '@libsql/client'

import * as schema from './schema'
import colorize from '@pinojs/json-colorizer'
import { TrpcContext } from './trpcContext'
import { extractUserFromAuthHeader, generateToken } from './jwtUtils'

// Add ExecutionContext type from Cloudflare Workers
type ExecutionContext = {
  waitUntil(promise: Promise<any>): void
  passThroughOnException(): void
}

export interface Env {
  TURSO_DATABASE_URL: string
  TURSO_AUTH_TOKEN: string
  JWT_SECRET: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
  'Access-Control-Max-Age': '86400'
}

async function handleOptions(request: Request) {
  if (
    request.headers.get('Origin') !== null &&
    request.headers.get('Access-Control-Request-Method') !== null &&
    request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Headers':
          request.headers.get('Access-Control-Request-Headers') || ''
      }
    })
  } else {
    return new Response(null, {
      headers: {
        Allow: 'GET, HEAD, POST, OPTIONS'
      }
    })
  }
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return handleOptions(request)
    }

    const turso = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN
    })

    const createTrpcContext = async (): Promise<TrpcContext> => {
      const authHeader = request.headers.get('authorization')
      const user = await extractUserFromAuthHeader(authHeader, env.JWT_SECRET)

      return {
        db: drizzle(turso, { schema }),
        env,
        user,
        req: request,
        generateToken: (user) => generateToken(user, env.JWT_SECRET)
      }
    }

    return fetchRequestHandler({
      endpoint: '/trpc',
      responseMeta: () => {
        return {
          headers: {
            ...corsHeaders
          }
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
        console.error(errCtx.error)
        console.error(`${type} ${path} failed for:`)
        console.error(
          colorize(JSON.stringify({ input, userId: ctx.user?.id }), {
            pretty: true
          })
        )

        return errCtx
      },
      req: request,
      router: appRouter,
      createContext: createTrpcContext
    })
  }
}
