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
import ReactDOM from 'react-dom'

export function RemoveDialog({
  open,
  onCancel,
  onRemove,
  title,
  description,
  loading
}: {
  open: boolean
  onCancel: (open: boolean) => void
  onRemove: () => void
  title: string
  description: React.ReactNode
  loading?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={!loading ? onCancel : undefined}>
      <DialogContent className="sm:max-w-[425px]" close={!loading}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="pt-2">{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onCancel(false)}
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
}) {
  const [open, setOpen] = useState(false)

  // Create a state for the portal div element
  const [portalDiv, setPortalDiv] = useState(null)

  // Initialize the portal div on mount and clean up on unmount
  useEffect(() => {
    // Create a new div that will be the portal for the RemoveDialog
    const div = document.createElement('div')
    const portalRoot = document.getElementById('portal-root')
    portalRoot.appendChild(div)
    setPortalDiv(div)

    // Cleanup function to remove the div from the body when the component unmounts
    return () => {
      // portalRoot.removeChild(div)
    }
  }, [])

  return (
    <>
      <div className="flex" onClick={() => setOpen(true)}>
        {children}
      </div>
      {portalDiv &&
        ReactDOM.createPortal(
          <RemoveDialog
            open={open}
            onCancel={() => setOpen(false)}
            onRemove={() => {
              onRemove()
              setOpen(false) // Optionally close the dialog after removal
            }}
            title={title}
            description={description}
            loading={loading}
          />,
          portalDiv // This is the target for the portal
        )}
    </>
  )
}
