import { Button } from "@/components/ui/button"
import {
  DialogClose,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle } from 'lucide-react'
import { useState } from "react" // Removed useEffect import, wasn't needed
import { trpcClient } from '@/lib/trpcClient'
// Removed unused djs import
import { DatePicker } from '@/components/ui/date-picker'
import { format } from 'date-fns'

interface MarkAsPaidDialogProps {
  invoiceId: string
  invoiceNumber: string
  onSuccess: () => void
  open: boolean // New prop
  onOpenChange: (open: boolean) => void // New prop
}

export function MarkAsPaidDialog({ invoiceId, invoiceNumber, onSuccess, open, onOpenChange }: MarkAsPaidDialogProps) {
  // Removed internal open state
  const [paidDate, setPaidDate] = useState<Date>(new Date())
  const markAsPaid = trpcClient.invoices.markAsPaid.useMutation({
    onSuccess: () => {
      onSuccess()
      onOpenChange(false) // Use callback to close
    },
    onError: (error) => {
      console.error("Failed to mark invoice as paid:", error)
    }
  })

  // Removed handleMarkAsPaid

  const handleCloseDialog = (e?: React.MouseEvent) => {
    // This can be handled by DialogClose or onOpenChange directly
    // If specific logic is needed before closing, it can stay, otherwise remove.
    // For now, let's rely on onOpenChange.
    if (e) { // Keep stopPropagation if needed for specific cases, but DialogClose might be better
        e.preventDefault()
        e.stopPropagation()
    }
    onOpenChange(false);
  }

  // Removed handleOpenChange - now handled by parent via props

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // Keep stopping propagation if needed within dialog context

    // Removed try/catch as onError handles it
    await markAsPaid.mutateAsync({
      id: invoiceId,
      paidOn: format(paidDate, 'yyyy-MM-dd')
    })
  }

  return (
    // Removed outer fragment and trigger div
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[425px]"

        >
          <DialogHeader>
            <DialogTitle>Označit fakturu jako zaplacenou</DialogTitle>
            <DialogDescription>
              Zadejte datum, kdy byla faktura {invoiceNumber} zaplacena.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="paid-date" className="text-right">
                Datum platby
              </label>
              <div className="col-span-3">
                <DatePicker
                  date={paidDate}
                  setDate={(date) => setPaidDate(date || new Date())}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            {/* Use DialogClose for standard closing behavior */}
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                // onClick={handleCloseDialog} // DialogClose handles this
                disabled={markAsPaid.isPending}
              >
                Zrušit
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={markAsPaid.isPending}
            >
              {markAsPaid.isPending ? "Ukládám..." : "Uložit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    // Removed closing fragment
  )
}
