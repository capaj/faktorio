import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import { drizzle } from 'drizzle-orm/libsql'
import { appRouter } from './trpcRouter'

import { createClient } from '@libsql/client'
import jwt, { type JwtPayload } from '@tsndr/cloudflare-worker-jwt'

import * as schema from './schema'
import colorize from '@pinojs/json-colorizer'
import { TrpcContext } from './trpcContext'

export interface Env {
  TURSO_DATABASE_URL: string
  TURSO_AUTH_TOKEN: string
  CLERK_SECRET_KEY: string
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
    ctx: ExecutionContext
  ): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return handleOptions(request)
    }

    const turso = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN
    })

    const createTrpcContext = async () => {
      const authHeader = request.headers.get('Authorization')

      let jwtPayload
      if (authHeader) {
        const token = authHeader.split(' ')[1]

        try {
          const isValid = await jwt.verify(token, publicKeyPEM, {
            algorithm: 'RS256'
          })

          if (isValid) {
            jwtPayload = jwt.decode(token) as JwtPayload
          }
        } catch (error) {
          console.error(error)
        }
      }
      return {
        db: drizzle(turso, { schema }),
        userId: jwtPayload?.payload?.sub,
        sessionId: jwtPayload?.payload?.sid as string
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
        console.error(`${type} ${path} failed for:`)
        console.error(
          colorize(JSON.stringify({ input, userId: ctx.userId }), {
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
