import AutoForm from '@/components/ui/auto-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
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

import { Link, useParams, useLocation } from 'wouter'
import { useEffect, useState } from 'react'
import { SpinnerContainer } from '@/components/SpinnerContainer'
import { z } from 'zod'

const AddressSchema = z.object({
  kodStatu: z.string(),
  nazevStatu: z.string(),
  kodKraje: z.number(),
  nazevKraje: z.string(),
  kodOkresu: z.number().optional(),
  nazevOkresu: z.string().optional(),
  kodObce: z.number(),
  nazevObce: z.string(),
  kodUlice: z.number(),
  nazevUlice: z.string(),
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
    autocomplete: 'off'
  }
}

export const fieldConfigForContactForm = {
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
  registration_no: {
    label: 'IČO - po vyplnění se automaticky doplní další údaje z ARESU',
    inputProps: {
      placeholder: '8 čísel',
      autocomplete: 'off'
    }
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

export const ContactList = () => {
  const contactsQuery = trpcClient.contacts.all.useQuery()
  const create = trpcClient.contacts.create.useMutation()
  const update = trpcClient.contacts.update.useMutation()
  const deleteContact = trpcClient.contacts.delete.useMutation()
  const params = useParams()

  const [open, setOpen] = useState(false)

  const schema = z.object({
    registration_no: z.string().min(8).max(8).optional(),
    vat_no: z.string().optional(),
    name: z.string().refine(
      (name) => {
        // make sure that the name is unique
        return !contactsQuery.data?.find((contact) => contact.name === name)
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
    main_email: z.string().email().nullable(),
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
    if (params.contactId) {
      if (params.contactId === 'new') {
        setOpen(true)
        return
      }

      ;(async () => {
        const contact = contactsQuery.data?.find(
          (contact) => contact.id === params.contactId
        )
        if (!contact) return
        // @ts-expect-error
        setValues(contact)
        setOpen(true)
      })()
    }
  }, [params.contactId])

  useEffect(() => {
    if (open === false && params.contactId) {
      navigate('/contacts')
    }
  }, [open])

  useEffect(() => {
    ;(async () => {
      if (values.registration_no?.length === 8 && !values.name) {
        // seems like a user is trying to add new contact, let's fetch data from ares
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
          setValues({
            ...values,
            name: aresData.obchodniJmeno,
            street: aresData.sidlo.nazevUlice,
            street2: aresData.sidlo.nazevCastiObce,
            city: aresData.sidlo.nazevObce,
            zip: String(aresData.sidlo.psc),
            vat_no: aresData.dic,
            country: aresData.sidlo.nazevStatu
          })
        } else {
          console.error(parse.error)
        }
      }
    })()
  }, [values.registration_no])

  const { contactId } = params

  return (
    <div>
      {contactId && contactId !== 'new' && (
        <Dialog open={open} onOpenChange={setOpen}>
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
              onSubmit={async (values) => {
                await update.mutateAsync({
                  ...values,
                  name: values.name as string,
                  id: contactId as string,
                  main_email: values.main_email || null
                })
                contactsQuery.refetch()
                setOpen(false)
              }}
              // @ts-expect-error
              fieldConfig={fieldConfigForContactForm}
            >
              <DialogFooter className="flex justify-between">
                <div className="w-full flex justify-between">
                  <Button
                    className="align-left self-start justify-self-start"
                    variant={'destructive'}
                    onClick={async (ev) => {
                      ev.preventDefault()
                      await deleteContact.mutateAsync(contactId)
                      contactsQuery.refetch()
                      setOpen(false)
                      navigate('/contacts')
                    }}
                  >
                    Smazat
                  </Button>
                  <Button type="submit">Uložit</Button>
                </div>
              </DialogFooter>
            </AutoForm>
          </DialogContent>
        </Dialog>
      )}
      {(!contactId || contactId === 'new') && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <Button variant={'default'}>Přidat klienta</Button>
          </DialogTrigger>
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
              onSubmit={async (values) => {
                // @ts-expect-error
                await create.mutateAsync(values)
                contactsQuery.refetch()
                setOpen(false)
              }}
              // @ts-expect-error
              fieldConfig={fieldConfigForContactForm}
            >
              <DialogFooter>
                <Button type="submit">Přidat kontakt</Button>
              </DialogFooter>
            </AutoForm>
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
                    onClick={() => {
                      if (contact.id === contactId) {
                        setOpen(true)
                      }
                    }}
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
