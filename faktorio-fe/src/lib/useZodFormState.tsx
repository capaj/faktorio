import { useState } from 'react'
import { z, ZodSchema, type ZodObject, type ZodTypeAny } from 'zod'

export function useZodFormState<
  T extends ZodObject<{ [key: string]: ZodTypeAny }>
>(zodSchema: T, defaultValues?: NoInfer<z.infer<T>>) {
  // Use TypeScript's ReturnType utility to infer the shape of the default state
  type SchemaOutput = ReturnType<T['parse']>

  // @ts-expect-error
  const defaultState: SchemaOutput = zodSchema.safeParse(defaultValues ?? {})

  const [state, setFormState] = useState<SchemaOutput>(defaultState.data)
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
    resetState: () => setFormState(defaultState),
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
      // @ts-expect-error typing reduce is hard
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

function getPrimitiveType(schema: ZodSchema<any>) {
  // @ts-expect-error
  if (zodPrimitiveTypes.includes(schema._def.typeName)) {
    // @ts-expect-error
    return schema._def.typeName
  }

  // @ts-expect-error
  return getPrimitiveType(schema.unwrap())
}
