import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { zodResolver } from '@/lib/zodResolver'

import { Link, useParams, useLocation } from 'wouter'
import { useEffect, useState, useRef, useMemo } from 'react'
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
import { Spinner } from '@/components/ui/spinner'
import { useForm, UseFormReturn } from 'react-hook-form'
import { ContactForm } from './ContactForm'

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

// Define base schema for reuse
const baseContactSchema = z.object({
  registration_no: z.string().max(16).optional(),
  vat_no: z.string().optional(),
  name: z.string(),
  street: z.string().optional(),
  street2: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  main_email: z.string().email().nullish(),
  phone_number: z.string().nullish(),
  language: z.string().optional()
})

export type ContactFormSchema = z.infer<typeof baseContactSchema>

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
  const [location, navigate] = useLocation()

  // Memoize schema to prevent unnecessary re-computation
  const schema = useMemo(
    () =>
      z.object({
        registration_no: z.string().max(16).optional(),
        vat_no: z.string().optional(),
        name: z.string().refine(
          (name) => {
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
        country: z.string().optional().default('Česká Republika'),
        main_email: z.string().email().nullish(),
        phone_number: z.string().nullish(),
        language: z.string().optional()
      }),
    [contactsQuery.data, contactId]
  )

  const defaults = {
    name: '',
    street: '',
    street2: '',
    city: '',
    zip: '',
    country: 'Česká Republika',
    main_email: null,
    phone_number: null,
    registration_no: '',
    vat_no: '',
    language: 'cs'
  }
  // Initialize forms with memoized resolvers
  const editForm = useForm<ContactFormSchema>({
    resolver: zodResolver(schema),
    defaultValues: defaults
  })

  const newForm = useForm<ContactFormSchema>({
    resolver: zodResolver(schema),
    defaultValues: defaults
  })

  const handleAresDataFetched = (
    aresData: z.infer<typeof AresBusinessInformationSchema>,
    form: UseFormReturn<ContactFormSchema>
  ) => {
    form.setValue('name', aresData.obchodniJmeno)
    form.setValue('street', formatStreetAddress(aresData))
    form.setValue('street2', aresData.sidlo.nazevCastiObce)
    form.setValue('city', aresData.sidlo.nazevObce)
    form.setValue('zip', String(aresData.sidlo.psc))
    form.setValue('vat_no', aresData.dic ?? '')
    form.setValue('country', aresData.sidlo.nazevStatu)
  }

  const fetchAresData = async (form: UseFormReturn<ContactFormSchema>) => {
    const registrationNo = form.getValues('registration_no')
    if (!registrationNo || registrationNo.length !== 8) return

    setIsLoadingAres(true)
    try {
      console.log('Fetching ARES data...', registrationNo)
      const aresResponse = await fetch(
        `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${registrationNo}`
      )
      const parse = AresBusinessInformationSchema.safeParse(
        await aresResponse.json()
      )
      console.log('parse', parse)
      if (parse.success) {
        const aresData = parse.data
        console.log('aresData', aresData)
        handleAresDataFetched(aresData, form)
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

  useEffect(() => {
    // Only run this effect when contactId changes and we have data
    if (params.contactId && contactsQuery.data) {
      if (params.contactId === 'new') {
        newForm.reset({
          name: '',
          street: '',
          street2: '',
          city: '',
          zip: '',
          country: 'Česká Republika',
          main_email: null,
          phone_number: null,
          registration_no: '',
          vat_no: '',
          language: 'cs'
        })
        setNewDialogOpen(true)
        setEditDialogOpen(false)
        return
      }

      const contact = contactsQuery.data.find(
        (contact) => contact.id === params.contactId
      )

      if (contact) {
        editForm.reset(contact as z.infer<typeof schema>)
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
  }, [params.contactId, contactsQuery.data, navigate, editForm, newForm])

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
  const handleUpdateSubmit = async (values: ContactFormSchema) => {
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
  const handleCreateSubmit = async (values: ContactFormSchema) => {
    await create.mutateAsync(values)
    contactsQuery.refetch()
    setNewDialogOpen(false)
    navigate('/contacts')
  }

  // Wrapper functions for ARES fetching
  const handleFetchAresEdit = () => fetchAresData(editForm)
  const handleFetchAresNew = () => fetchAresData(newForm)

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
    // Ensure edit dialog is closed first
    setEditDialogOpen(false)
    setShowDeleteDialog(false)

    newForm.reset({
      name: '',
      street: '',
      street2: '',
      city: '',
      zip: '',
      country: '',
      main_email: null,
      phone_number: null,
      registration_no: '',
      vat_no: '',
      language: 'cs'
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

      {/* Edit Contact Dialog - Conditionally rendered */}
      {editDialogOpen && (
        <Dialog open={editDialogOpen} onOpenChange={handleEditModalClose}>
          <DialogContent className="max-w-screen-lg overflow-y-auto max-h-screen">
            <DialogHeader>
              <DialogTitle>Editace kontaktu</DialogTitle>
            </DialogHeader>

            <ContactForm
              form={editForm}
              onSubmit={handleUpdateSubmit}
              isEdit={true}
              hasInvoices={hasInvoices}
              invoiceCount={invoiceCount}
              deleteInvoices={deleteInvoices}
              setDeleteInvoices={setDeleteInvoices}
              handleShowDeleteDialog={handleShowDeleteDialog}
              isLoadingAres={isLoadingAres}
              onFetchAres={handleFetchAresEdit}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog - Conditionally rendered */}
      {showDeleteDialog && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                Opravdu chcete smazat kontakt{' '}
                <strong>{editForm.getValues('name')}</strong>?
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
      )}

      {/* New Contact Dialog - Conditionally rendered */}
      {newDialogOpen && (
        <Dialog open={newDialogOpen} onOpenChange={handleNewModalClose}>
          <DialogContent className="max-w-screen-lg overflow-y-auto max-h-screen">
            <DialogHeader>
              <DialogTitle>Nový kontakt</DialogTitle>
            </DialogHeader>

            <ContactForm
              form={newForm}
              onSubmit={handleCreateSubmit}
              isEdit={false}
              isLoadingAres={isLoadingAres}
              onFetchAres={handleFetchAresNew}
            />
          </DialogContent>
        </Dialog>
      )}

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
