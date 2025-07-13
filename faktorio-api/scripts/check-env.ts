import { ZodError } from 'zod/v4'
import { envSchema } from '../src/envSchema'

console.log('Checking environment variables...')

try {
  envSchema.parse(process.env)
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
