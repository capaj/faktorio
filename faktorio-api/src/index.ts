import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import { drizzle } from 'drizzle-orm/libsql'
import { appRouter } from './trpcRouter'

import { createClient } from '@libsql/client'

import * as schema from './schema'
import colorize from '@pinojs/json-colorizer'
import { TrpcContext } from './trpcContext'
import { extractUserFromAuthHeader, generateToken } from './jwtUtils'
import { GoogleAIFileManager } from '@google/generative-ai/server'
import { GoogleGenAI } from '@google/genai'
import { Env } from './envSchema'

// Add ExecutionContext type from Cloudflare Workers
type ExecutionContext = {
  waitUntil(promise: Promise<any>): void
  passThroughOnException(): void
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

    const apiKey = env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured')
    }

    // Initialize the Gemini client
    const genAI = new GoogleGenAI({ apiKey })

    const createTrpcContext = async (): Promise<TrpcContext> => {
      const authHeader = request.headers.get('authorization')
      const user = await extractUserFromAuthHeader(authHeader, env.JWT_SECRET)
      const fileManager = new GoogleAIFileManager(env.GEMINI_API_KEY)

      return {
        db: drizzle(turso, { schema }),
        env,
        user,
        req: request,
        googleGenAIFileManager: fileManager,
        googleGenAI: genAI,
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

        const inputLength = JSON.stringify(input).length
        if (inputLength < 1000) {
          console.error(
            colorize(JSON.stringify({ errCtx: input, userId: ctx.user?.id }), {
              pretty: true
            })
          )
        } else {
          console.error(
            colorize(
              JSON.stringify({
                errCtx: 'Input too long',
                userId: ctx.user?.id
              }),
              {
                pretty: true
              }
            )
          )
        }

        return errCtx
      },
      req: request,
      router: appRouter,
      createContext: createTrpcContext
    })
  }
}
