import { FormControl, FormItem, FormMessage } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

import AutoFormLabel from '../common/label'
import AutoFormTooltip from '../common/tooltip'
import { AutoFormInputComponentProps } from '../types'
import { getBaseSchema } from '../utils'

export default function AutoFormEnum({
  label,
  isRequired,
  field,
  fieldConfigItem,
  zodItem,
  fieldProps
}: AutoFormInputComponentProps) {
  const baseSchema = getBaseSchema(zodItem) as any

  // In Zod v4, enums have a public 'options' property
  let values: [string, string][] = []

  if (baseSchema && baseSchema.options) {
    // Standard ZodEnum with options array
    values = baseSchema.options.map((value: string) => [value, value])
  } else if (baseSchema && baseSchema._def) {
    // Fallback: check the internal structure
    if (baseSchema._def.entries) {
      // Zod v4 enum internal structure
      values = Object.entries(baseSchema._def.entries)
    } else if (baseSchema._def.values) {
      // Legacy structure fallback
      const baseValues = baseSchema._def.values
      if (!Array.isArray(baseValues)) {
        values = Object.entries(baseValues)
      } else {
        values = baseValues.map((value: string) => [value, value])
      }
    }
  }

  function findItem(value: any) {
    return values.find((item) => item[0] === value)
  }

  return (
    <FormItem>
      <AutoFormLabel label={label} isRequired={isRequired} />
      <FormControl>
        <Select
          onValueChange={field.onChange}
          defaultValue={field.value}
          {...fieldProps}
        >
          <SelectTrigger className={fieldProps.className}>
            <SelectValue placeholder={fieldConfigItem.inputProps?.placeholder}>
              {field.value ? findItem(field.value)?.[1] : 'Select an option'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {values.map(([value, label]) => (
              <SelectItem value={label} key={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormControl>
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
      <FormMessage />
    </FormItem>
  )
}
