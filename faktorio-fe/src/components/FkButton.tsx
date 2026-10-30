import { Slot } from '@radix-ui/react-slot'
import React from 'react'
import { ButtonProps, buttonVariants } from './ui/button'
import { cn } from '@/lib/utils'
import { Spinner } from './ui/spinner'

/**
 * faktorio button component
 */
export const FkButton = React.forwardRef<
  HTMLButtonElement,
  ButtonProps & { isLoading?: boolean }
>(({ className, variant, size, asChild = false, isLoading, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
      type={props.type || 'button'}
      disabled={props.disabled || isLoading}
    >
      <div className="relative">
        <div
          className={cn('flex items-center gap-1 whitespace-nowrap', {
            'text-white text-opacity-0': isLoading
          })}
        >
          {props.children}
        </div>
        <div
          className={`absolute inset-0 z-10 flex items-center justify-center ${
            isLoading ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Spinner />
        </div>
      </div>
    </Comp>
  )
})
