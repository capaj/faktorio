import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers'
import {
  type FieldError,
  type FieldErrors,
  type FieldValues,
  type Resolver,
  type ResolverError,
  type ResolverSuccess,
  appendErrors
} from 'react-hook-form'
import { z } from 'zod/v4'

// TODO remove this whole file when https://github.com/react-hook-form/resolvers/issues/768#issue-2991311095

/**
 * Determines if an error is a Zod error by checking for the presence of an issues array.
 */
const isZodError = (error: unknown): error is z.core.$ZodError =>
  error !== null &&
  typeof error === 'object' &&
  'issues' in error &&
  Array.isArray((error as { issues?: unknown }).issues)

/**
 * Parses Zod validation errors into a format compatible with react-hook-form.
 *
 * @param {z.core.$ZodIssue[]} zodErrors - The array of Zod validation issues
 * @param {boolean} validateAllFieldCriteria - Whether to validate all field criteria
 * @returns {Record<string, FieldError>} Formatted errors for react-hook-form
 */
function parseErrorSchema(
  zodErrors: z.core.$ZodIssue[],
  validateAllFieldCriteria: boolean
) {
  const errors: Record<string, FieldError> = {}
  for (; zodErrors.length; ) {
    const error = zodErrors[0]
    const { code, message, path } = error
    // Convert path to string
    const _path = path.map((p) => String(p)).join('.')

    if (!errors[_path]) {
      // Handle invalid_union type errors
      if (code === 'invalid_union') {
        const invalidUnionError = error as z.core.$ZodIssueInvalidUnion
        // Use the first issue from the first union error
        const firstError = invalidUnionError.errors[0]?.[0]

        if (firstError) {
          errors[_path] = {
            message: firstError.message,
            type: firstError.code || 'validation_error'
          }
        }
      } else {
        errors[_path] = {
          message,
          type: code || 'validation_error'
        }
      }
    }

    // Add all union errors to the processing queue
    if (code === 'invalid_union') {
      const invalidUnionError = error as z.core.$ZodIssueInvalidUnion
      invalidUnionError.errors.forEach((unionErrors) =>
        unionErrors.forEach((e) => zodErrors.push(e))
      )
    }

    if (validateAllFieldCriteria) {
      const types = errors[_path]?.types
      const messages = types && code ? types[code] : undefined

      if (_path) {
        errors[_path] = appendErrors(
          _path,
          validateAllFieldCriteria,
          errors,
          code || 'validation_error',
          messages
            ? ([] as string[]).concat(messages as string[], message)
            : message
        ) as FieldError
      }
    }

    zodErrors.shift()
  }

  return errors
}

/**
 * Type definition for Zod parse context derived from the parse method's parameters.
 */
type ParseContext = Parameters<z.ZodType['parse']>[1]

export function zodResolver<Input extends FieldValues, Context, Output>(
  schema: z.ZodSchema<Output>,
  schemaOptions?: ParseContext,
  resolverOptions?: {
    mode?: 'async' | 'sync'
    raw?: false
  }
): Resolver<Input, Context, Output>

export function zodResolver<Input extends FieldValues, Context, Output>(
  schema: z.ZodSchema<Output>,
  schemaOptions?: ParseContext,
  resolverOptions?: {
    mode?: 'async' | 'sync'
    raw: true
  }
): Resolver<Input, Context, Input>

/**
 * Creates a resolver function for react-hook-form that validates form data using a Zod schema.
 *
 * @param {z.ZodSchema<Output>} schema - The Zod schema used to validate the form data
 * @param {ParseContext} [schemaOptions] - Optional configuration options for Zod parsing
 * @param {Object} [resolverOptions] - Optional resolver-specific configuration
 * @param {('async'|'sync')} [resolverOptions.mode='async'] - Validation mode. Use 'sync' for synchronous validation
 * @param {boolean} [resolverOptions.raw=false] - If true, returns the raw form values instead of the parsed data
 * @returns {Resolver<z.output<typeof schema>>} A resolver function compatible with react-hook-form
 * @throws {Error} Throws if validation fails with a non-Zod error
 */
export function zodResolver<Input extends FieldValues, Context, Output>(
  schema: z.ZodSchema<Output>,
  schemaOptions?: ParseContext,
  resolverOptions: {
    mode?: 'async' | 'sync'
    raw?: boolean
  } = {}
): Resolver<Input, Context, Output | Input> {
  return async (values: Input, _, options) => {
    try {
      const data = await schema[
        resolverOptions.mode === 'sync' ? 'parse' : 'parseAsync'
      ](values, schemaOptions)

      options.shouldUseNativeValidation && validateFieldsNatively({}, options)

      const resolverResult: ResolverSuccess<Output | Input> = {
        errors: {} as ResolverSuccess<Output | Input>['errors'],
        values: (resolverOptions.raw
          ? Object.assign({}, values)
          : data) as ResolverSuccess<Output | Input>['values']
      }

      return resolverResult
    } catch (error) {
      if (isZodError(error)) {
        const resolverError: ResolverError<Input> = {
          values: {} as ResolverError<Input>['values'],
          errors: toNestErrors(
            parseErrorSchema(
              error.issues,
              !options.shouldUseNativeValidation &&
                options.criteriaMode === 'all'
            ),
            options
          ) as ResolverError<Input>['errors']
        }

        return resolverError
      }

      throw error
    }
  }
}
