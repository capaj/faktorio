import { FormControl, FormItem, FormLabel } from '@/components/ui/form'
import { DatePicker } from '@/components/ui/date-picker'
import { djs } from 'faktorio-shared/src/djs'

export const createDateFieldConfig = (label: string) => ({
  label,
  fieldType: ({ label, isRequired, field }: any) => (
    <FormItem className="flex flex-col">
      <FormLabel>
        {label}
        {isRequired && <span className="text-destructive">{`\u00A0*`}</span>}
      </FormLabel>
      <FormControl>
        <DatePicker
          date={field.value ? djs(field.value).toDate() : undefined}
          setDate={(date) => {
            field.onChange(date ? djs(date).format('YYYY-MM-DD') : '')
          }}
        />
      </FormControl>
    </FormItem>
  )
})
