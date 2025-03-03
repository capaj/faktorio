import React, { useEffect, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from './ui/dialog'
import { Button } from './ui/button'
import { Spinner } from './ui/spinner'
import ReactDOM, { Root } from 'react-dom/client'

export function RemoveDialogInner({
  open,
  onCancel,
  onRemove,
  title,
  description,
  loading
}: {
  open: boolean
  onCancel: () => void
  onRemove: () => void
  title: React.ReactNode
  description?: React.ReactNode
  loading?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={!loading ? onCancel : undefined}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="pt-2">{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onCancel()}
            disabled={loading}
          >
            Zrušit
          </Button>

          <Button
            className="flex items-center gap-2"
            variant="destructive"
            onClick={() => onRemove()}
            disabled={loading}
          >
            {loading && <Spinner />}
            Smazat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// New version that supports open and onOpenChange props
export function RemoveDialogControlled({
  open,
  onOpenChange,
  onRemove,
  title,
  description,
  loading
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRemove: () => void
  title: React.ReactNode
  description?: React.ReactNode
  loading?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={!loading ? onOpenChange : undefined}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="pt-2">{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Zrušit
          </Button>

          <Button
            className="flex items-center gap-2"
            variant="destructive"
            onClick={() => onRemove()}
            disabled={loading}
          >
            {loading && <Spinner />}
            Smazat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RemoveDialogUncontrolled({
  onRemove,
  title,
  description,
  children,
  loading
}: {
  onRemove: () => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  loading?: boolean
}) {
  const [open, setOpen] = useState(false)

  const root = React.useRef<Root | null>(null)
  // Create a state for the portal div element
  // const [portalDiv, setPortalDiv] = useState(null)

  // Initialize the portal div on mount and clean up on unmount
  useEffect(() => {
    // Create a new div that will be the portal for the RemoveDialog

    if (!root.current) {
      root.current = ReactDOM.createRoot(
        document.getElementById('portal-root') as HTMLElement // This is the target for the portal
      )
    }
    if (!root.current) {
      throw new Error('root.current is null')
    }
    root.current.render(
      <RemoveDialogInner
        open={open}
        onCancel={() => {
          root.current?.unmount()
        }}
        onRemove={() => {
          onRemove()
          root.current?.unmount()
        }}
        title={title}
        description={description}
        loading={loading}
      />
    )

    // setPortalDiv(div)

    // Cleanup function to remove the div from the body when the component unmounts
    return () => {
      // portalRoot.removeChild(div)
    }
  }, [open])

  return (
    <>
      <div className="w-full" onClick={() => setOpen(true)}>
        {children}
      </div>
    </>
  )
}
