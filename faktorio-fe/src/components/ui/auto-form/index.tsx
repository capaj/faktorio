'use client'
import { Form } from '@/components/ui/form'
import React from 'react'
import { DefaultValues, SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod/v4'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { zodResolver } from '@/lib/zodResolver'

import AutoFormObject from './fields/object'
import { Dependency, FieldConfig } from './types'
import {
  ZodObjectOrWrapped,
  getDefaultValues,
  getObjectFormSchema
} from './utils'

export function AutoFormSubmit({
  children,
  className
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <Button type="submit" className={className}>
      {children ?? 'Submit'}
    </Button>
  )
}

function AutoForm<SchemaType extends ZodObjectOrWrapped>({
  formSchema,
  values: valuesProp,
  onValuesChange,
  onParsedValuesChange,
  onSubmit: onSubmitProp,
  fieldConfig,
  children,
  className,
  dependencies,
  containerClassName
}: {
  formSchema: SchemaType
  values?: Partial<z.infer<SchemaType>>
  onValuesChange?: (values: z.infer<SchemaType>) => void
  onParsedValuesChange?: (values: z.infer<SchemaType>) => void
  onSubmit?: (values: z.infer<SchemaType>) => void
  fieldConfig?: FieldConfig<z.infer<SchemaType>>
  children?: React.ReactNode
  className?: string
  containerClassName?: string
  dependencies?: Dependency<z.infer<SchemaType>>[]
}) {
  const objectFormSchema = getObjectFormSchema(formSchema)
  const defaultValues: DefaultValues<z.infer<typeof objectFormSchema>> | null =
    getDefaultValues(objectFormSchema, fieldConfig)

  const form = useForm<z.infer<typeof objectFormSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues ?? undefined,
    values: valuesProp
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    const parsedValues = formSchema.safeParse(values)
    if (parsedValues.success) {
      onSubmitProp?.(parsedValues.data as z.infer<SchemaType>)
    }
  }

  const values = form.watch()
  // valuesString is needed because form.watch() returns a new object every time
  const valuesString = JSON.stringify(values)

  React.useEffect(() => {
    onValuesChange?.(values as z.infer<SchemaType>)

    const parsedValues = formSchema.safeParse(values)
    if (parsedValues.success) {
      onParsedValuesChange?.(parsedValues.data as z.infer<SchemaType>)
    } else {
      console.log('Form validation failed:', parsedValues.error)
    }
  }, [valuesString])

  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={(e) => {
            form.handleSubmit(
              onSubmit as SubmitHandler<z.infer<typeof objectFormSchema>>
            )(e)
          }}
          className={cn('space-y-5', className)}
        >
          <AutoFormObject<typeof objectFormSchema>
            schema={objectFormSchema}
            form={form}
            containerClassName={containerClassName}
            dependencies={
              dependencies as Dependency<z.infer<typeof objectFormSchema>>[]
            }
            fieldConfig={fieldConfig}
          />

          {children}
        </form>
      </Form>
    </div>
  )
}

export default AutoForm
