import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import * as z from 'zod/v4'
import AutoFormLabel from '../common/label'
import AutoFormTooltip from '../common/tooltip'
import { AutoFormInputComponentProps } from '../types'
import { getBaseSchema } from '../utils'

export default function AutoFormRadioGroup({
  label,
  isRequired,
  field,
  zodItem,
  fieldProps,
  fieldConfigItem
}: AutoFormInputComponentProps) {
  const baseSchema = getBaseSchema(zodItem) as any

  // In Zod v4, enums have a public 'options' property
  let values: string[] = []

  if (baseSchema && baseSchema.options) {
    // Standard ZodEnum with options array
    values = baseSchema.options
  } else if (baseSchema && baseSchema._def) {
    // Fallback: check the internal structure
    if (baseSchema._def.entries) {
      // Zod v4 enum internal structure
      values = Object.keys(baseSchema._def.entries)
    } else if (baseSchema._def.values) {
      // Legacy structure fallback
      const baseValues = baseSchema._def.values
      if (!Array.isArray(baseValues)) {
        values = Object.keys(baseValues)
      } else {
        values = baseValues
      }
    }
  }

  return (
    <div>
      <FormItem>
        <AutoFormLabel label={label} isRequired={isRequired} />
        <FormControl>
          <RadioGroup
            onValueChange={field.onChange}
            defaultValue={field.value}
            {...fieldProps}
          >
            {values?.map((value: any) => (
              <FormItem
                key={value}
                className="mb-2 flex items-center gap-3 space-y-0"
              >
                <FormControl>
                  <RadioGroupItem value={value} />
                </FormControl>
                <FormLabel className="font-normal">{value}</FormLabel>
              </FormItem>
            ))}
          </RadioGroup>
        </FormControl>
        <FormMessage />
      </FormItem>
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
    </div>
  )
}
