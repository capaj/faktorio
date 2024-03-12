import AutoForm from '@/components/ui/auto-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

import { Link, useParams } from 'wouter'
import { contactCreateFormSchema } from '../../../../faktorio-api/src/routers/contactCreateFormSchema'
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
  typCisloDomovni: z.string(),
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
  radekAdresy2: z.string(),
  radekAdresy3: z.string().optional() // Added optional third line
})

const AresBusinessInformationSchema = z.object({
  ico: z.string(),
  obchodniJmeno: z.string(),
  sidlo: AddressSchema,
  pravniForma: z.string(),
  financniUrad: z.string(),
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
    label: 'IČO',
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
  }
}

const schema = z.object({
  registration_no: z.string().min(8).max(8).optional(),
  vat_no: z.string().optional(),
  name: z.string().optional(),
  street: z.string().optional(),
  street2: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  main_email: z.string().email().nullish(),
  phone_number: z.string().nullish()
})

export const ContactList = () => {
  const contactsQuery = trpcClient.contacts.all.useQuery()
  const create = trpcClient.contacts.create.useMutation()
  const update = trpcClient.contacts.update.useMutation()
  const params = useParams()

  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<z.infer<typeof schema>>({})

  useEffect(() => {
    if (params.contactId) {
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
    ;(async () => {
      if (values.registration_no?.length === 8 && !values.name) {
        // seems like a user is trying to add new contact, let's fetch data from ares
        const aresResponse = await fetch(
          `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${values.registration_no}`
        )
        const parse = AresBusinessInformationSchema.safeParse(
          await aresResponse.json()
        )

        if (parse.success) {
          const aresData = parse.data
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
      {contactId && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <Button variant={'default'}>Přidat klienta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editace kontaktu</DialogTitle>
              <AutoForm
                formSchema={schema}
                values={values}
                onParsedValuesChange={setValues}
                onSubmit={async (values) => {
                  await update.mutateAsync({
                    ...values,
                    id: contactId as string
                  })
                  contactsQuery.refetch()
                  setOpen(false)
                }}
                // @ts-expect-error
                fieldConfig={fieldConfigForContactForm}
              >
                <DialogFooter>
                  <Button type="submit">Uložit</Button>
                </DialogFooter>
              </AutoForm>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}
      {!params.contactId && (
        <Dialog open={Boolean(open && params.contactId)} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nový kontakt</DialogTitle>

              <AutoForm
                formSchema={schema}
                values={values}
                onParsedValuesChange={setValues}
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
                  <Button type="submit">Přidat</Button>
                </DialogFooter>
              </AutoForm>
            </DialogHeader>
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
