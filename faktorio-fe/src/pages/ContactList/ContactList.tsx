import AutoForm from '@/components/ui/auto-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog'
import {
  TableCaption,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table
} from '@/components/ui/table'
import { trpcClient } from '@/lib/trpcClient'
import { FkButton } from '@/components/FkButton'

import { Link, useParams, useLocation } from 'wouter'
import { useEffect, useState, useRef, useCallback } from 'react'
import { SpinnerContainer } from '@/components/SpinnerContainer'
import { z } from 'zod/v4'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { UploadIcon, HelpCircleIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'

const AddressSchema = z.object({
  kodStatu: z.string(),
  nazevStatu: z.string(),
  kodKraje: z.number(),
  nazevKraje: z.string(),
  kodOkresu: z.number().optional(),
  nazevOkresu: z.string().optional(),
  kodObce: z.number(),
  nazevObce: z.string(),
  kodUlice: z.number().optional(),
  nazevUlice: z.string().optional(),
  cisloDomovni: z.number(),
  kodCastiObce: z.number(),
  nazevCastiObce: z.string(),
  kodAdresnihoMista: z.number(),
  psc: z.number(),
  textovaAdresa: z.string(),
  typCisloDomovni: z.number(),
  standardizaceAdresy: z.boolean(),
  kodSpravnihoObvodu: z.number().optional(),
  nazevSpravnihoObvodu: z.string().optional(),
  kodMestskehoObvodu: z.number().optional(),
  nazevMestskehoObvodu: z.string().optional(),
  kodMestskeCastiObvodu: z.number().optional(),
  nazevMestskeCastiObvodu: z.string().optional(),
  cisloOrientacni: z.number().optional()
})

const DeliveryAddressSchema = z.object({
  radekAdresy1: z.string(),
  radekAdresy2: z.string().optional(),
  radekAdresy3: z.string().optional() // Added optional third line
})

export const AresBusinessInformationSchema = z.object({
  ico: z.string(),
  obchodniJmeno: z.string(),
  sidlo: AddressSchema,
  pravniForma: z.string(),
  financniUrad: z.string().nullish(),
  datumVzniku: z.string(),
  datumAktualizace: z.string(),
  dic: z.string().optional(), // Made optional to ensure compatibility with future data that might not include this
  icoId: z.string(),
  adresaDorucovaci: DeliveryAddressSchema,
  primarniZdroj: z.string(),
  czNace: z.array(z.string())
  // seznamRegistraci is omitted
})

const acFieldConfig = {
  inputProps: {
    autoComplete: 'off'
  }
}

export const fieldConfigForContactForm = {
  registration_no: {
    label: 'IČO',
    inputProps: {
      placeholder: '8 čísel',
      autoComplete: 'off'
    }
  },
  name: {
    label: 'Jméno',
    className: 'col-span-2',
    ...acFieldConfig
  },
  city: {
    label: 'Město',
    ...acFieldConfig
  },
  street: {
    label: 'Ulice',
    ...acFieldConfig
  },
  street2: {
    label: 'Ulice 2',
    ...acFieldConfig
  },
  main_email: {
    label: 'Email',
    ...acFieldConfig
  },

  vat_no: {
    label: 'DIČ',
    ...acFieldConfig
  },
  zip: {
    label: 'Poštovní směrovací číslo',
    ...acFieldConfig
  },
  phone_number: {
    label: 'Telefon',
    ...acFieldConfig
  },
  country: {
    label: 'Země',
    ...acFieldConfig
  }
}

export const createFieldConfigForContactForm = (
  onAresDataFetched: (
    aresData: z.infer<typeof AresBusinessInformationSchema>
  ) => void,
  isLoadingAres: boolean,
  setIsLoadingAres: (loading: boolean) => void,
  values: any
) => {
  const fetchAresData = async () => {
    if (!values?.registration_no || values.registration_no.length !== 8) return

    setIsLoadingAres(true)
    try {
      console.log('Fetching ARES data...', values.registration_no)
      const aresResponse = await fetch(
        `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${values.registration_no}`
      )
      const parse = AresBusinessInformationSchema.safeParse(
        await aresResponse.json()
      )
      console.log('parse', parse)
      if (parse.success) {
        const aresData = parse.data
        console.log('aresData', aresData)
        onAresDataFetched(aresData)
        toast.success('Údaje z ARESU byly úspěšně načteny')
      } else {
        console.error(parse.error)
        toast.error('Nepodařilo se načíst údaje z ARESU')
      }
    } catch (error) {
      console.error('ARES fetch error:', error)
      toast.error('Chyba při načítání údajů z ARESU')
    } finally {
      setIsLoadingAres(false)
    }
  }

  return {
    ...fieldConfigForContactForm,
    registration_no: {
      ...fieldConfigForContactForm.registration_no,
      renderParent: ({ children }: { children: React.ReactNode }) => (
        <div className="flex items-end space-x-2">
          <div className="flex-1">{children}</div>
          <FkButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={fetchAresData}
            disabled={
              !values?.registration_no ||
              values.registration_no.length !== 8 ||
              isLoadingAres
            }
            isLoading={isLoadingAres}
          >
            Načíst z ARESU
          </FkButton>
        </div>
      )
    }
  }
}

export const formatStreetAddress = (
  aresData: z.infer<typeof AresBusinessInformationSchema>
) => {
  const streetName =
    aresData.sidlo.nazevUlice ?? aresData.sidlo.nazevCastiObce ?? ''
  const houseNumber = aresData.sidlo.cisloDomovni
  const orientationNumber = aresData.sidlo.cisloOrientacni
    ? `/${aresData.sidlo.cisloOrientacni}`
    : ''

  return `${streetName} ${houseNumber}${orientationNumber}`
}

export const ContactList = () => {
  const contactsQuery = trpcClient.contacts.all.useQuery()
  const create = trpcClient.contacts.create.useMutation()
  const createMany = trpcClient.contacts.createMany.useMutation()
  const update = trpcClient.contacts.update.useMutation()
  const deleteContact = trpcClient.contacts.delete.useMutation()
  const deleteWithInvoices =
    trpcClient.contacts.deleteWithInvoices.useMutation()
  const params = useParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const contactId = params.contactId

  // Query to get the invoice count for the current contact
  const invoiceCountQuery = trpcClient.contacts.getInvoiceCount.useQuery(
    {
      contactId: contactId || ''
    },
    {
      enabled: !!contactId && contactId !== 'new'
    }
  )
  const invoiceCount = invoiceCountQuery.data || 0
  const hasInvoices = invoiceCount > 0

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [deleteInvoices, setDeleteInvoices] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isLoadingAres, setIsLoadingAres] = useState(false)

  const handleAresDataFetched = (
    aresData: z.infer<typeof AresBusinessInformationSchema>
  ) => {
    setValues({
      ...values,
      name: aresData.obchodniJmeno,
      street: formatStreetAddress(aresData),
      street2: aresData.sidlo.nazevCastiObce,
      city: aresData.sidlo.nazevObce,
      zip: String(aresData.sidlo.psc),
      vat_no: aresData.dic ?? undefined,
      country: aresData.sidlo.nazevStatu
    })
  }

  const schema = z.object({
    registration_no: z.string().max(16).optional(), // 16 should be long enough for any registration number in the world
    vat_no: z.string().optional(),
    name: z.string().refine(
      (name) => {
        // make sure that the name is unique
        return !contactsQuery.data?.find((contact) => {
          return contact.name === name && contact.id !== contactId
        })
      },
      {
        message: 'Kontakt s tímto jménem již existuje'
      }
    ),
    street: z.string().optional(),
    street2: z.string().optional(),
    city: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    main_email: z.string().email().nullish(),
    phone_number: z.string().nullish()
  })

  const [values, setValues] = useState<z.infer<typeof schema>>({
    name: '',
    street: '',
    street2: '',
    city: '',
    zip: '',
    country: '',
    main_email: null
  })
  const [location, navigate] = useLocation()

  useEffect(() => {
    // Only run this effect when contactId changes and we have data
    if (params.contactId && contactsQuery.data) {
      if (params.contactId === 'new') {
        setNewDialogOpen(true)
        setEditDialogOpen(false)
        return
      }

      const contact = contactsQuery.data.find(
        (contact) => contact.id === params.contactId
      )

      if (contact) {
        setValues(contact as z.infer<typeof schema>)
        setEditDialogOpen(true)
        setNewDialogOpen(false)
      } else {
        // If contact not found, navigate back to contacts
        navigate('/contacts')
      }
    } else {
      // No contactId in URL, close both dialogs
      setEditDialogOpen(false)
      setNewDialogOpen(false)
    }
  }, [params.contactId, contactsQuery.data, navigate])

  // Handle edit modal close
  const handleEditModalClose = (isOpen: boolean) => {
    setEditDialogOpen(isOpen)

    if (!isOpen) {
      // Only navigate back if we're on a contact detail page
      if (params.contactId && params.contactId !== 'new') {
        navigate('/contacts')
      }
    }
  }

  // Handle new contact modal close
  const handleNewModalClose = (isOpen: boolean) => {
    setNewDialogOpen(isOpen)

    if (!isOpen && params.contactId === 'new') {
      navigate('/contacts')
    }
  }

  // Handle contact link click
  const handleContactClick = (e: React.MouseEvent, contactId: string) => {
    e.preventDefault()
    navigate(`/contacts/${contactId}`)
  }

  const csvFormatExample = `name,street,city,zip,country,registration_no,vat_no,email
Company Ltd,123 Main St,Prague,10000,CZ,12345678,CZ12345678,contact@example.com`

  const handleCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const contacts = results.data as Record<string, string>[]

          // Map CSV fields to contact fields
          const mappedContacts = contacts.map((contact) => ({
            name: contact.name || '',
            street: contact.street || '',
            street2: contact.street2 || '',
            city: contact.city || '',
            zip: contact.zip || '',
            country: contact.country || '',
            registration_no: contact.registration_no || '',
            vat_no: contact.vat_no || '',
            bank_account: contact.bank_account || '',
            iban: contact.iban || '',
            web: contact.web || '',
            variable_symbol: contact.variable_symbol || '',
            full_name: contact.full_name || '',
            phone: contact.phone || '',
            main_email: contact.email || '',
            email: contact.email || '',
            email_copy: contact.email_copy || '',
            private_note: contact.private_note || '',
            type: contact.type || '',
            due: contact.due ? parseInt(contact.due) : undefined,
            currency: contact.currency || '',
            language: contact.language || ''
          }))

          // Filter out contacts with empty names
          const validContacts = mappedContacts.filter(
            (contact) => contact.name.trim() !== ''
          )

          if (validContacts.length === 0) {
            toast.error('Žádné platné kontakty k importu')
            setIsImporting(false)
            return
          }

          await createMany.mutateAsync(validContacts)
          contactsQuery.refetch()
          toast.success(`Úspěšně importováno ${validContacts.length} kontaktů`)

          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        } catch (error) {
          console.error('Import failed:', error)
          toast.error('Import selhal')
        } finally {
          setIsImporting(false)
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error)
        toast.error('Chyba při parsování CSV souboru')
        setIsImporting(false)
      }
    })
  }

  // Handle form submission for updating a contact
  const handleUpdateSubmit = async (values: z.infer<typeof schema>) => {
    await update.mutateAsync({
      ...values,
      name: values.name as string,
      id: contactId as string,
      main_email: values.main_email || null
    })
    contactsQuery.refetch()
    setEditDialogOpen(false)
    navigate('/contacts')
  }

  // Handle form submission for creating a new contact
  const handleCreateSubmit = async (values: z.infer<typeof schema>) => {
    await create.mutateAsync(values)
    contactsQuery.refetch()
    setNewDialogOpen(false)
    navigate('/contacts')
  }

  // Handle contact deletion
  const handleDeleteContact = async () => {
    if (contactId) {
      await deleteWithInvoices.mutateAsync({
        contactId,
        deleteInvoices
      })
      contactsQuery.refetch()
      setEditDialogOpen(false)
      setShowDeleteDialog(false)
      navigate('/contacts')
    }
  }

  // Show delete confirmation dialog
  const handleShowDeleteDialog = (ev: React.MouseEvent) => {
    ev.preventDefault()
    setShowDeleteDialog(true)
  }

  // Handle opening the new contact dialog
  const handleAddClientClick = () => {
    setValues({
      name: '',
      street: '',
      street2: '',
      city: '',
      zip: '',
      country: '',
      main_email: null
    })
    navigate('/contacts/new')
  }

  return (
    <div>
      {/* Add Client Button - Outside of dialogs */}
      <div className="flex gap-2 mb-4">
        <Button variant={'default'} onClick={handleAddClientClick}>
          Přidat klienta
        </Button>
        <div className="relative flex items-end ml-auto">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            <UploadIcon className="mr-2 h-4 w-4" />
            {isImporting ? 'Importuji...' : 'Import CSV'}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            className="hidden"
            onChange={handleCsvImport}
            disabled={isImporting}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-1">
                  <HelpCircleIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-md">
                <div>
                  <p className="font-semibold mb-1">CSV formát:</p>
                  <p className="mb-2">
                    Soubor musí obsahovat hlavičku s názvy sloupců. Povinné pole
                    je pouze "name".
                  </p>
                  <p className="text-xs font-mono bg-muted p-2 rounded whitespace-pre-wrap overflow-x-auto">
                    {csvFormatExample}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Edit Contact Dialog - Always in DOM */}
      <Dialog open={editDialogOpen} onOpenChange={handleEditModalClose}>
        <DialogContent className="max-w-screen-lg overflow-y-auto max-h-screen">
          <DialogHeader>
            <DialogTitle>Editace kontaktu</DialogTitle>
          </DialogHeader>

          <AutoForm
            containerClassName="grid grid-cols-2 gap-4"
            formSchema={schema}
            values={values}
            onParsedValuesChange={(values) => {
              setValues(values)
            }}
            onValuesChange={(values) => {
              setValues(values)
            }}
            onSubmit={handleUpdateSubmit}
            fieldConfig={createFieldConfigForContactForm(
              handleAresDataFetched,
              isLoadingAres,
              setIsLoadingAres,
              values
            )}
          >
            <DialogFooter className="flex justify-between">
              <div className="w-full flex justify-between">
                <div className="flex flex-col items-start gap-2">
                  {hasInvoices && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="delete-invoices"
                        checked={deleteInvoices}
                        onCheckedChange={(checked) =>
                          setDeleteInvoices(checked === true)
                        }
                      />
                      <label
                        htmlFor="delete-invoices"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Smazat všechny faktury kontaktu ({invoiceCount})
                      </label>
                    </div>
                  )}
                  <Button
                    className="align-left self-start justify-self-start"
                    variant={'destructive'}
                    onClick={handleShowDeleteDialog}
                    disabled={hasInvoices && !deleteInvoices}
                  >
                    Smazat
                  </Button>
                </div>
                <Button type="submit">Uložit</Button>
              </div>
            </DialogFooter>
          </AutoForm>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Opravdu chcete smazat kontakt <strong>{values.name}</strong>?
            </DialogTitle>
            {hasInvoices && deleteInvoices && (
              <DialogDescription className="pt-2 text-red-500">
                Budou smazány také všechny faktury ({invoiceCount}) spojené s
                tímto kontaktem!
              </DialogDescription>
            )}
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Zrušit
            </Button>

            <Button
              className="flex items-center gap-2"
              variant="destructive"
              onClick={handleDeleteContact}
            >
              {deleteWithInvoices.isPending && <Spinner />}
              Smazat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Contact Dialog - Always in DOM */}
      <Dialog open={newDialogOpen} onOpenChange={handleNewModalClose}>
        <DialogContent className="max-w-screen-lg overflow-y-auto max-h-screen">
          <DialogHeader>
            <DialogTitle>Nový kontakt</DialogTitle>
          </DialogHeader>

          <AutoForm
            formSchema={schema}
            values={values}
            onParsedValuesChange={setValues}
            onValuesChange={(values) => {
              setValues(values)
            }}
            containerClassName="grid grid-cols-2 gap-4"
            onSubmit={handleCreateSubmit}
            fieldConfig={createFieldConfigForContactForm(
              handleAresDataFetched,
              isLoadingAres,
              setIsLoadingAres,
              values
            )}
          >
            <DialogFooter>
              <Button type="submit">Přidat kontakt</Button>
            </DialogFooter>
          </AutoForm>
        </DialogContent>
      </Dialog>

      <SpinnerContainer loading={contactsQuery.isLoading}>
        <Table>
          {(contactsQuery.data?.length ?? 0) > 1 && (
            <TableCaption>Celkem {contactsQuery.data?.length}</TableCaption>
          )}
          <TableHeader>
            <TableRow>
              <TableHead>Jméno</TableHead>
              <TableHead>Adresa</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>IČO</TableHead>
              <TableHead>DIČ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contactsQuery.data?.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">
                  <Link
                    onClick={(e) => handleContactClick(e, contact.id)}
                    href={`/contacts/${contact.id}`}
                  >
                    {contact.name}
                  </Link>
                </TableCell>
                <TableCell>
                  {contact.street}, {contact.city}
                </TableCell>
                <TableCell>{contact.main_email}</TableCell>
                <TableCell>{contact.registration_no}</TableCell>
                <TableCell className="text-right">{contact.vat_no}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SpinnerContainer>
    </div>
  )
}
