import { useState } from 'react'
import { z, ZodSchema, type ZodObject, type ZodTypeAny } from 'zod/v4'

export function useZodFormState<
  T extends ZodObject<{ [key: string]: ZodTypeAny }>
>(zodSchema: T, defaultValues?: NoInfer<z.infer<T>>) {
  // Use TypeScript's ReturnType utility to infer the shape of the default state
  type SchemaOutput = z.infer<T>

  const defaultState = zodSchema.safeParse(defaultValues ?? {})

  const [state, setFormState] = useState<SchemaOutput>(
    defaultState?.data ?? ({} as SchemaOutput)
  )
  console.log('state:', state)

  const parseResult = zodSchema.safeParse(state)

  // const handleChange = (e:  { target: { name: string; value: unknown } }) => {
  const handleChange = (e: any) => {
    const fieldName = e.target.name
    let fieldValue = e.target.value

    // Attempt to safely parse the field value using a dynamic approach
    const fieldSchema =
      zodSchema.shape[fieldName as keyof typeof zodSchema.shape]

    // console.log('fieldSchema:', fieldSchema)
    const primitiveType = getPrimitiveType(fieldSchema)

    if (
      fieldValue &&
      fieldValue.endsWith('.') === false &&
      fieldValue.endsWith(',') === false &&
      primitiveType === 'ZodNumber'
    ) {
      const parsed = parseFloat(fieldValue)
      fieldValue = isNaN(parsed) ? fieldValue : parsed
    }

    if (fieldSchema) {
      const result = fieldSchema.safeParse(fieldValue)
      console.log('result:', result)
      if (result.success) {
        const newState = { ...state, [fieldName]: result.data }
        setFormState(newState)
      } else {
        setFormState({ ...state, [fieldName]: fieldValue })
      }
    }
  }

  return {
    formState: state,
    setFormState,
    setField: (
      name: keyof SchemaOutput,
      value: SchemaOutput[keyof SchemaOutput]
    ) => {
      setFormState({ ...state, [name]: value })
    },
    handleChange,
    defaultState: defaultState.data,
    resetState: () => setFormState(defaultState.data ?? ({} as SchemaOutput)),
    inputProps: (name: keyof SchemaOutput) => {
      const value: any = state[name] ?? ''
      return {
        name,
        value,
        onChange: handleChange
      }
    },
    checkboxProps(name: keyof SchemaOutput) {
      return {
        name,
        checked: !!state[name],
        onCheckedChange: (value: boolean) => {
          setFormState({ ...state, [name]: value })
        }
      }
    },
    parseErrors:
      (parseResult.error?.issues.reduce((acc, issue) => {
        return { ...acc, [issue.path[0]]: issue }
      }, {}) as { [key in keyof SchemaOutput]?: { message: string } }) ?? {}
  }
}

const zodPrimitiveTypes = [
  'ZodString',
  'ZodNumber',
  'ZodBigInt',
  'ZodBoolean',
  'ZodDate',
  'ZodUndefined',
  'ZodNull',
  'ZodVoid'
]

function getPrimitiveType(schema: ZodSchema<any>): string {
  // In Zod v4, use constructor.name instead of _def.typeName
  const typeName = schema.constructor.name

  if (zodPrimitiveTypes.includes(typeName)) {
    return typeName
  }

  // Manual unwrapping for Zod v4 - handle wrapped types
  if (schema && '_def' in schema && schema._def) {
    // Handle ZodOptional, ZodNullable, ZodDefault, etc.
    if ('innerType' in schema._def && schema._def.innerType) {
      return getPrimitiveType(schema._def.innerType as ZodSchema<any>)
    }

    // Handle ZodPipe (replacement for ZodEffects)
    if ('out' in schema._def && schema._def.out) {
      return getPrimitiveType(schema._def.out as ZodSchema<any>)
    }

    // Handle other wrapped schemas
    if ('schema' in schema._def && schema._def.schema) {
      return getPrimitiveType(schema._def.schema as ZodSchema<any>)
    }
  }

  // Return the type name if we can't unwrap further
  return typeName
}
