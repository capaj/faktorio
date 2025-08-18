import * as React from 'react'

import { cn } from '@/lib/utils'

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value'> {
  value?: string | number | readonly string[] | boolean | null | undefined
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, value, ...props }, ref) => {
    const normalizedValue: string | number | readonly string[] | undefined =
      value === null || value === undefined
        ? ''
        : typeof value === 'boolean'
          ? String(value)
          : value
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        value={normalizedValue}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
