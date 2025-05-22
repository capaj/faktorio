import React from 'react'
import { DefaultValues } from 'react-hook-form'
import { z } from 'zod/v4'
import { FieldConfig } from './types'

// Updated for Zod v4 - ZodEffects has been replaced with ZodPipe for transforms
export type ZodObjectOrWrapped =
  | z.ZodObject<any, any>
  | z.ZodPipe<any, z.ZodObject<any, any>>

/**
 * Beautify a camelCase string.
 * e.g. "myString" -> "My String"
 */
export function beautifyObjectName(string: string) {
  // if numbers only return the string
  let output = string.replace(/([A-Z])/g, ' $1')
  output = output.charAt(0).toUpperCase() + output.slice(1)
  return output
}

/**
 * Get the lowest level Zod type.
 * This will unpack optionals, refinements, etc.
 */
export function getBaseSchema<ChildType extends z.ZodType = z.ZodType>(
  schema: ChildType | z.ZodPipe<any, ChildType>
): ChildType | null {
  if (!schema) return null

  // Handle ZodPipe (replacement for ZodEffects in v4)
  if (
    '_def' in schema &&
    schema._def &&
    'in' in schema._def &&
    'out' in schema._def
  ) {
    // This is a ZodPipe, get the output schema
    return getBaseSchema((schema as any)._def.out as ChildType)
  }

  // Handle other wrapped types by checking for inner schemas
  if ('_def' in schema && schema._def) {
    if ('innerType' in schema._def) {
      return getBaseSchema(schema._def.innerType as ChildType)
    }
    if ('schema' in schema._def) {
      return getBaseSchema(schema._def.schema as ChildType)
    }
  }

  return schema as ChildType
}

/**
 * Get the type name of the lowest level Zod type.
 * This will unpack optionals, refinements, etc.
 */
export function getBaseType(schema: z.ZodType): string {
  const baseSchema = getBaseSchema(schema)
  if (!baseSchema) return ''

  // In Zod v4, use constructor name as the primary method
  return baseSchema.constructor.name
}

/**
 * Search for a "ZodDefault" in the Zod stack and return its value.
 */
export function getDefaultValueInZodStack(schema: z.ZodType): any {
  // Handle ZodDefault specifically
  if (schema.constructor.name === 'ZodDefault') {
    const typedSchema = schema as any
    if (
      typedSchema._def &&
      typeof typedSchema._def.defaultValue === 'function'
    ) {
      return typedSchema._def.defaultValue()
    }
    if (typedSchema._def && typedSchema._def.defaultValue !== undefined) {
      return typedSchema._def.defaultValue
    }
  }

  // Handle wrapped schemas
  if ('_def' in schema && schema._def) {
    if ('innerType' in schema._def) {
      return getDefaultValueInZodStack(schema._def.innerType as z.ZodType)
    }
    if ('schema' in schema._def) {
      return getDefaultValueInZodStack(schema._def.schema as z.ZodType)
    }
  }

  return undefined
}

/**
 * Get all default values from a Zod schema.
 */
export function getDefaultValues<Schema extends z.ZodObject<any, any>>(
  schema: Schema,
  fieldConfig?: FieldConfig<z.infer<Schema>>
) {
  if (!schema) return null
  const { shape } = schema
  type DefaultValuesType = DefaultValues<Partial<z.infer<Schema>>>
  const defaultValues = {} as DefaultValuesType
  if (!shape) return defaultValues

  for (const key of Object.keys(shape)) {
    const item = shape[key] as z.ZodType

    if (getBaseType(item) === 'ZodObject') {
      const defaultItems = getDefaultValues(
        getBaseSchema(item) as unknown as z.ZodObject<any, any>,
        fieldConfig?.[key] as FieldConfig<z.infer<Schema>>
      )

      if (defaultItems !== null) {
        for (const defaultItemKey of Object.keys(defaultItems)) {
          const pathKey = `${key}.${defaultItemKey}` as keyof DefaultValuesType
          const value = (defaultItems as any)[defaultItemKey]
          ;(defaultValues as any)[pathKey] = value
        }
      }
    } else {
      let defaultValue = getDefaultValueInZodStack(item)
      if (!defaultValue && fieldConfig?.[key]?.inputProps) {
        defaultValue = (fieldConfig?.[key]?.inputProps as unknown as any)
          .defaultValue
      }
      if (defaultValue !== undefined) {
        defaultValues[key as keyof DefaultValuesType] = defaultValue
      }
    }
  }

  return defaultValues
}

export function getObjectFormSchema(
  schema: ZodObjectOrWrapped
): z.ZodObject<any, any> {
  // Check if it's a ZodPipe (replacement for ZodEffects)
  if (
    '_def' in schema &&
    schema._def &&
    'in' in schema._def &&
    'out' in schema._def
  ) {
    // This is a ZodPipe, get the output schema
    return getObjectFormSchema((schema as any)._def.out)
  }
  return schema as z.ZodObject<any, any>
}

/**
 * Convert a Zod schema to HTML input props to give direct feedback to the user.
 * Once submitted, the schema will be validated completely.
 */
export function zodToHtmlInputProps(
  schema:
    | z.ZodNumber
    | z.ZodString
    | z.ZodOptional<z.ZodNumber | z.ZodString>
    | any
): React.InputHTMLAttributes<HTMLInputElement> {
  const schemaType = schema.constructor.name

  if (['ZodOptional', 'ZodNullable'].includes(schemaType)) {
    const typedSchema = schema as z.ZodOptional<z.ZodNumber | z.ZodString>
    return {
      ...zodToHtmlInputProps(typedSchema._def.innerType),
      required: false
    }
  }

  const typedSchema = schema as z.ZodNumber | z.ZodString

  if (!('checks' in typedSchema._def)) {
    return {
      required: true
    }
  }

  const { checks } = typedSchema._def
  const inputProps: React.InputHTMLAttributes<HTMLInputElement> = {
    required: true
  }
  const type = getBaseType(schema)

  if (checks) {
    for (const check of checks) {
      // Handle min/max checks with proper type checking
      if (
        check &&
        typeof check === 'object' &&
        'kind' in check &&
        'value' in check
      ) {
        if (check.kind === 'min') {
          if (type === 'ZodString') {
            inputProps.minLength = check.value as number
          } else {
            inputProps.min = check.value as number
          }
        }
        if (check.kind === 'max') {
          if (type === 'ZodString') {
            inputProps.maxLength = check.value as number
          } else {
            inputProps.max = check.value as number
          }
        }
      }
    }
  }

  return inputProps
}
