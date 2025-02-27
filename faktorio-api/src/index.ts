import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import { drizzle } from 'drizzle-orm/libsql'
import { appRouter } from './trpcRouter'

import { createClient } from '@libsql/client'
import jwt, { type JwtPayload } from '@tsndr/cloudflare-worker-jwt'

import * as schema from './schema'
import colorize from '@pinojs/json-colorizer'
import { TrpcContext } from './trpcContext'
import { userT } from './schema'
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

// Token expiration time in seconds (1 year)
const JWT_EXPIRATION = 60 * 60 * 24 * 365

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

      let jwtPayload
      if (authHeader) {
        const token = authHeader.split(' ')[1]

        try {
          const isValid = await jwt.verify(token, env.JWT_SECRET)
          if (isValid) {
            jwtPayload = jwt.decode(token) as JwtPayload
          }
        } catch (error) {
          console.error(error)
        }
      }
      return {
        db: drizzle(turso, { schema }),
        env,
        user: jwtPayload?.payload?.user as typeof userT.$inferSelect,
        req: request,
        generateToken: async (user: typeof userT.$inferSelect) => {
          const payload = {
            ...user,
            passwordHash: undefined,
            googleId: undefined
          }
          return await jwt.sign(
            {
              user: payload,
              exp: Math.floor(Date.now() / 1000) + JWT_EXPIRATION
            },
            env.JWT_SECRET
          )
        }
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
