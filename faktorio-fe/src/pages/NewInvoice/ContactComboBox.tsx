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

export function ComboboxDemo() {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState('')
  const contactsQuery = trpcClient.contacts.all.useQuery()
  const contacts = contactsQuery.data ?? []

  return (
    <div className="flex m-4 center justify-center items-center place-items-center place-content-center">
      <h4 className="mr-6">Kontakt</h4>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between"
          >
            {value
              ? contacts.find((contact) => contact.id === value)?.id
              : 'Vyberte kontakt...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Hledat ..." />
            <CommandEmpty>Takový kontakt nenalezen</CommandEmpty>
            <CommandList>
              <CommandGroup>
                {contacts.map((contact) => {
                  const contactKey = contact.name || contact.id
                  return (
                    <CommandItem
                      key={contactKey}
                      value={contactKey}
                      onSelect={(currentValue) => {
                        console.log('currentValue:', currentValue)
                        setValue(currentValue === value ? '' : currentValue)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === contactKey ? 'opacity-100' : 'opacity-0'
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
