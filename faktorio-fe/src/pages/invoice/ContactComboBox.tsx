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
    if (!value) {
      const lastUsedContactId = lastInvoice?.client_contact_id
      if (lastUsedContactId) {
        props.onChange?.(lastUsedContactId) // preselect the last used contact
      }
    }
  }, [contactsQuery.data])

  // Find the selected contact by ID
  const selectedContact = contacts.find((contact) => contact.id === value)

  return (
    <div
      className="flex m-4 center justify-center items-center place-items-center place-content-center"
      style={{
        opacity: props.disabled ? 0.7 : 1
      }}
    >
      <h4 className="mr-6">Odběratel</h4>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[300px] justify-between"
            disabled={props.disabled}
          >
            {selectedContact ? selectedContact.name : 'Vyberte kontakt...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0">
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
