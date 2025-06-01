import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { FormField } from '@/components/ui/form'
import {
  Path,
  useForm,
  useFormContext,
  ControllerRenderProps,
  FieldValues
} from 'react-hook-form'
import * as z from 'zod/v4'
import { DEFAULT_ZOD_HANDLERS, INPUT_COMPONENTS } from '../config'
import { Dependency, FieldConfig, FieldConfigItem } from '../types'
import {
  beautifyObjectName,
  getBaseSchema,
  getBaseType,
  zodToHtmlInputProps
} from '../utils'
import AutoFormArray from './array'
import resolveDependencies from '../dependencies'

function DefaultParent({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export default function AutoFormObject<
  SchemaType extends z.ZodObject<any, any>
>({
  schema,
  form,
  fieldConfig,
  containerClassName,
  path = [],
  dependencies = []
}: {
  schema: SchemaType | z.ZodPipe<any, SchemaType>
  form: ReturnType<typeof useForm<z.infer<SchemaType>>>
  fieldConfig?: FieldConfig<z.infer<SchemaType>>
  path?: string[]
  containerClassName?: string
  dependencies?: Dependency<z.infer<SchemaType>>[]
}) {
  const { watch } = useFormContext() // Use useFormContext to access the watch function

  if (!schema) {
    return null
  }
  const { shape } = getBaseSchema<SchemaType>(schema) || {}

  if (!shape) {
    return null
  }

  const handleIfZodNumber = (item: z.ZodType) => {
    const isZodNumber = item.constructor.name === 'ZodNumber'
    const isInnerZodNumber =
      (item as any)._def?.innerType?.constructor?.name === 'ZodNumber'

    if (isZodNumber) {
      ;(item as any)._def.coerce = true
    } else if (isInnerZodNumber) {
      ;(item as any)._def.innerType._def.coerce = true
    }

    return item
  }

  type SchemaShape = z.infer<SchemaType>
  type ShapeKeys = keyof SchemaShape

  return (
    <Accordion
      type="multiple"
      className={`space-y-5 border-none ${containerClassName}`}
    >
      {(Object.keys(shape) as ShapeKeys[]).map((name) => {
        let item = shape[name] as z.ZodType
        item = handleIfZodNumber(item) as z.ZodType
        const zodBaseType = getBaseType(item)
        const fieldConfigForField = (fieldConfig?.[name] ??
          {}) as FieldConfigItem
        const itemName =
          (fieldConfigForField.label as string) ??
          beautifyObjectName(name as string)
        const key = [...path, name as string].join('.')

        const {
          isHidden,
          isDisabled,
          isRequired: isRequiredByDependency,
          overrideOptions
        } = resolveDependencies(dependencies, name, watch)
        if (isHidden) {
          return null
        }

        if (zodBaseType === 'ZodObject') {
          return (
            <AccordionItem
              value={name as string}
              key={key}
              className="border-none"
            >
              <AccordionTrigger>{itemName}</AccordionTrigger>
              <AccordionContent className="p-2">
                <AutoFormObject
                  schema={item as z.ZodObject<any, any>}
                  form={
                    form as unknown as ReturnType<
                      typeof useForm<z.infer<z.ZodObject<any, any>>>
                    >
                  }
                  fieldConfig={fieldConfigForField}
                  path={[...path, name as string]}
                />
              </AccordionContent>
            </AccordionItem>
          )
        }
        if (zodBaseType === 'ZodArray') {
          return (
            <AutoFormArray
              key={key}
              name={name as string}
              item={item as z.ZodArray<any>}
              form={form}
              fieldConfig={fieldConfig?.[name] ?? {}}
              path={[...path, name as string]}
            />
          )
        }

        const fieldConfigItem: FieldConfigItem = fieldConfig?.[name] ?? {}
        const zodInputProps = zodToHtmlInputProps(item)
        const isRequired =
          isRequiredByDependency ||
          zodInputProps.required ||
          fieldConfigItem.inputProps?.required ||
          false

        if (overrideOptions) {
          item = z.enum(overrideOptions)
        }

        return (
          <FormField
            control={form.control}
            name={key as Path<z.infer<SchemaType>>}
            key={key}
            render={({ field }) => {
              const inputType =
                fieldConfigItem.fieldType ??
                DEFAULT_ZOD_HANDLERS[zodBaseType] ??
                'fallback'

              const InputComponent =
                typeof inputType === 'function'
                  ? inputType
                  : INPUT_COMPONENTS[inputType]

              const ParentElement =
                fieldConfigItem.renderParent ?? DefaultParent

              const defaultValue = fieldConfigItem.inputProps?.defaultValue
              const value = field.value ?? defaultValue ?? ''

              const fieldProps = {
                ...zodToHtmlInputProps(item),
                ...field,
                ...fieldConfigItem.inputProps,
                disabled: fieldConfigItem.inputProps?.disabled || isDisabled,
                ref: undefined,
                value: value
              }

              if (InputComponent === undefined) {
                return <></>
              }

              return (
                <ParentElement key={`${key}.parent`}>
                  <InputComponent
                    zodInputProps={zodInputProps}
                    field={
                      field as unknown as ControllerRenderProps<
                        FieldValues,
                        string
                      >
                    }
                    fieldConfigItem={fieldConfigItem}
                    label={itemName}
                    isRequired={isRequired}
                    zodItem={item}
                    fieldProps={fieldProps}
                    className={fieldProps.className}
                  />
                </ParentElement>
              )
            }}
          />
        )
      })}
    </Accordion>
  )
}
