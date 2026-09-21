import { useState, type FormEvent } from 'react'
import { Mail, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { trpcClient, type RouterOutputs } from '@/lib/trpcClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  invoiceEmailTemplate,
  type InvoiceEmailKind,
  type InvoiceEmailLanguage
} from 'faktorio-shared/src/invoiceEmail'

type EmailFields = {
  to: string
  subject: string
  body: string
  language: InvoiceEmailLanguage
}

export function InvoiceEmailControls({
  invoice
}: {
  invoice: {
    id: string
    paid_on: string | null
    status: string | null
    cancelled_at: string | null
    sent_at: string | null
    reminder_sent_at: string | null
  }
}) {
  const [kind, setKind] = useState<InvoiceEmailKind | null>(null)
  const utils = trpcClient.useUtils()
  const draft = trpcClient.invoices.getEmailDraft.useQuery(
    { invoiceId: invoice.id, kind: kind ?? 'invoice' },
    { enabled: kind !== null, staleTime: 0 }
  )
  const send = trpcClient.invoices.sendEmail.useMutation({
    onSuccess: () => {
      toast.success('E-mail byl odeslán.')
      setKind(null)
      void utils.invoices.invalidate()
    },
    onError: (error) => toast.error(error.message)
  })

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">Odeslání e-mailem</h3>
      <p className="text-sm text-muted-foreground">
        Pošlete klientovi fakturu nebo připomenutí platby s odkazem na zobrazení
        a stažení PDF.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!!invoice.cancelled_at}
          onClick={() => setKind('invoice')}
        >
          <Mail className="mr-2 h-4 w-4" />
          Odeslat fakturu
        </Button>
        <Button
          variant="outline"
          disabled={
            !!invoice.cancelled_at ||
            !!invoice.paid_on ||
            invoice.status === 'paid'
          }
          onClick={() => setKind('reminder')}
        >
          <Bell className="mr-2 h-4 w-4" />
          Odeslat upomínku
        </Button>
      </div>
      {invoice.sent_at && (
        <p className="text-sm text-muted-foreground">
          Poslední odeslání faktury: {invoice.sent_at}
        </p>
      )}
      {invoice.reminder_sent_at && (
        <p className="text-sm text-muted-foreground">
          Poslední upomínka: {invoice.reminder_sent_at}
        </p>
      )}
      <Dialog
        open={kind !== null}
        onOpenChange={(open) => {
          if (!open && !send.isPending) setKind(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {kind === 'reminder' ? 'Odeslat upomínku' : 'Odeslat fakturu'}
            </DialogTitle>
            <DialogDescription>
              Text je předvyplněn podle jazyka kontaktu. Příjemce, předmět i
              zprávu můžete upravit.
            </DialogDescription>
          </DialogHeader>
          {draft.isError ? (
            <div role="alert" className="space-y-2">
              <p>{draft.error.message}</p>
              <Button variant="outline" onClick={() => void draft.refetch()}>
                Zkusit znovu
              </Button>
            </div>
          ) : !draft.data ? (
            <p role="status">Načítání…</p>
          ) : (
            kind && (
              <InvoiceEmailForm
                key={`${invoice.id}-${kind}`}
                draft={draft.data}
                kind={kind}
                pending={send.isPending}
                onCancel={() => setKind(null)}
                onSend={(fields) =>
                  send.mutate({ invoiceId: invoice.id, kind, ...fields })
                }
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function InvoiceEmailForm({
  draft,
  kind,
  pending,
  onCancel,
  onSend
}: {
  draft: RouterOutputs['invoices']['getEmailDraft']
  kind: InvoiceEmailKind
  pending: boolean
  onCancel: () => void
  onSend: (fields: EmailFields) => void
}) {
  const [language, setLanguage] = useState(draft.language)
  const [to, setTo] = useState(draft.to)
  const [message, setMessage] = useState(() =>
    invoiceEmailTemplate(draft, draft.language, kind)
  )
  const changeLanguage = (next: InvoiceEmailLanguage) => {
    const previous = invoiceEmailTemplate(draft, language, kind)
    if (
      (message.subject !== previous.subject ||
        message.body !== previous.body) &&
      !window.confirm(
        'Změna jazyka nahradí upravený předmět a text e-mailu novou šablonou. Pokračovat?'
      )
    )
      return
    setLanguage(next)
    setMessage(invoiceEmailTemplate(draft, next, kind))
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!pending) onSend({ to: to.trim(), language, ...message })
  }
  return (
    <form className="space-y-4" onSubmit={submit}>
      <fieldset disabled={pending} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="invoice-email-to">Příjemce</Label>
          <Input
            id="invoice-email-to"
            type="email"
            required
            maxLength={254}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoice-email-language">Jazyk e-mailu</Label>
          <select
            id="invoice-email-language"
            className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={language}
            onChange={(e) =>
              changeLanguage(e.target.value as InvoiceEmailLanguage)
            }
          >
            <option value="cs">Česky</option>
            <option value="en">English</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Změní pouze tento e-mail, nikoli jazyk kontaktu nebo faktury.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoice-email-subject">Předmět</Label>
          <Input
            id="invoice-email-subject"
            required
            maxLength={200}
            value={message.subject}
            onChange={(e) =>
              setMessage({ ...message, subject: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoice-email-body">Zpráva</Label>
          <Textarea
            id="invoice-email-body"
            required
            rows={10}
            maxLength={20000}
            value={message.body}
            onChange={(e) => setMessage({ ...message, body: e.target.value })}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Pod zprávu automaticky přidáme odkaz na fakturu. Příjemce si z něj
          může stáhnout PDF bez přihlášení. Odkaz můžete později zneplatnit v
          sekci Sdílení faktury.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Zrušit
          </Button>
          <Button
            type="submit"
            disabled={
              pending ||
              !to.trim() ||
              !message.subject.trim() ||
              !message.body.trim()
            }
          >
            {pending ? 'Odesílání…' : 'Odeslat e-mail'}
          </Button>
        </div>
      </fieldset>
    </form>
  )
}
