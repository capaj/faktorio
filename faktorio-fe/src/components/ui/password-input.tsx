import { EyeIcon, EyeOffIcon } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input, type InputProps } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { proxy, useSnapshot } from 'valtio'
const state = proxy({
  show: false
})

const PasswordInput = ({
  ref,
  className,
  ...props
}: InputProps & {
  ref?: React.RefCallback<HTMLInputElement>
}) => {
  const snap = useSnapshot(state)
  return (
    <div className="relative">
      <Input
        {...props}
        type={state.show ? 'text' : 'password'}
        name="password_fake"
        className={cn('hide-password-toggle pr-10', className)}
        ref={ref}
      />
      <Button
        type="button"
        variant="ghost"
        tabIndex={-1}
        size="sm"
        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
        onClick={() => {
          state.show = !state.show
        }}
        disabled={props.disabled}
      >
        {snap.show ? (
          <EyeIcon className="h-4 w-4" aria-hidden="true" />
        ) : (
          <EyeOffIcon className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="sr-only">
          {snap.show ? 'Hide password' : 'Show password'}
        </span>
      </Button>

      {/* hides browsers password toggles */}
      <style>{`
                .hide-password-toggle::-ms-reveal,
                .hide-password-toggle::-ms-clear {
                    visibility: hidden;
                    pointer-events: none;
                    display: none;
                }
            `}</style>
    </div>
  )
}
PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
