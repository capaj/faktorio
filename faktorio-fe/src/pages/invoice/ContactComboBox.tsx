import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { trpcClient } from '@/lib/trpcClient'
import { useEffect } from 'react'

export function ContactComboBox(props: {
  onChange?: (value: string) => void
  value: string
  onBlur?: () => void
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [lastInvoice] = trpcClient.invoices.lastInvoice.useSuspenseQuery()

  const contactsQuery = trpcClient.contacts.all.useQuery()
  const contacts = contactsQuery.data ?? []
  const { value } = props

  useEffect(() => {
    const defaultContactValue = contacts.length === 1 ? contacts[0].id : ''
    if (!value) {
      const lastUsedContactId = lastInvoice?.client_contact_id

      const firstContact = contacts?.[0]

      // NOTE: when the newest contact is added recently, select it
      if (
        firstContact &&
        new Date().getTime() -
          new Date(firstContact.created_at?.replace(' ', 'T') + 'Z').getTime() <
          1000 * 60 * 2 // 2 minutes
      ) {
        props.onChange?.(firstContact.id)
        return
      }

      props.onChange?.(
        lastUsedContactId || defaultContactValue || firstContact?.id
      )
    }
  }, [contactsQuery.data])

  // Find the selected contact by ID
  const selectedContact = contacts.find((contact) => contact.id === value)

  return (
    <div
      className="flex center justify-center items-center place-items-center place-content-center"
      style={{
        opacity: props.disabled ? 0.7 : 1
      }}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between overflow-hidden text-ellipsis whitespace-nowrap"
            disabled={props.disabled}
            style={{
              opacity: props.disabled ? 0.7 : 1
            }}
          >
            <span className="overflow-hidden text-ellipsis">
              {selectedContact ? selectedContact.name : 'Vyberte kontakt...'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
          <Command>
            <CommandInput placeholder="Hledat ..." />
            <CommandEmpty>Takový kontakt nenalezen</CommandEmpty>
            <CommandList>
              <CommandGroup>
                {contacts.map((contact) => {
                  return (
                    <CommandItem
                      key={contact.id}
                      value={contact.name}
                      onSelect={() => {
                        props.onChange?.(contact.id === value ? '' : contact.id)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === contact.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {contact.name}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
