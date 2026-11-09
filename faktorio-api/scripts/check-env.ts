/// <reference types="node" />
import { ZodError } from 'zod/v4'
import { unstable_readConfig } from 'wrangler'
import { envSchema } from '../src/envSchema'

console.log('Checking environment variables...')

try {
  // Plain vars from wrangler.toml are deployed with the Worker, so they count
  // as set even though they are not in process.env
  const { vars } = unstable_readConfig({})
  envSchema.parse({ ...vars, ...process.env })
  console.log('✅ Environment variables are valid.')
  process.exit(0)
} catch (error) {
  if (error instanceof ZodError) {
    console.error('❌ Invalid environment variables:')

    error.issues.forEach((err) => {
      console.error(`  - ${err.path?.join('.')}: ${err.message}`)
    })
  } else {
    console.error(
      '❌ An unexpected error occurred during environment variable validation:',
      error
    )
  }
  process.exit(1)
}
