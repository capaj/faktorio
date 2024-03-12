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

export const fieldConfigForContactForm = {
  name: {
    label: 'Jméno'
  },
  street: {
    label: 'Ulice'
  },
  street2: {
    label: 'Ulice 2'
  },
  main_email: {
    label: 'Email'
  },
  registration_no: {
    label: 'IČO'
  },
  vat_no: {
    label: 'DIČ'
  },
  zip: {
    label: 'Poštovní směrovací číslo'
  },
  phone_number: {
    label: 'Telefon'
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
  main_email: z.string().email().optional(),
  phone_number: z.string().optional()
})

export const ContactList = () => {
  const contactsQuery = trpcClient.contacts.all.useQuery()
  const create = trpcClient.contacts.create.useMutation()
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

        setValues(contact)
        setOpen(true)
      })()
    }
  }, [params.contactId])

  useEffect(() => {
    ;(async () => {
      if (values.registration_no?.length === 8) {
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
  return (
    <div>
      {params.contactId && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <Button variant={'default'}>Přidat klienta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nový kontakt</DialogTitle>
              <DialogDescription>
                <AutoForm
                  formSchema={schema}
                  values={values}
                  onParsedValuesChange={setValues}
                  onSubmit={async (values) => {
                    await create.mutateAsync(values)
                    contactsQuery.refetch()
                    setOpen(false)
                    setValues({})
                  }}
                  fieldConfig={fieldConfigForContactForm}
                >
                  <DialogFooter>
                    <Button type="submit">Přidat</Button>
                  </DialogFooter>
                </AutoForm>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}
      {!params.contactId && (
        <Dialog open={Boolean(open && params.contactId)} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nový kontakt</DialogTitle>
              <DialogDescription>
                <AutoForm
                  formSchema={schema}
                  values={values}
                  onParsedValuesChange={setValues}
                  onSubmit={async (values) => {
                    await create.mutateAsync(values)
                    contactsQuery.refetch()
                    setOpen(false)
                  }}
                  fieldConfig={fieldConfigForContactForm}
                >
                  <DialogFooter>
                    <Button type="submit">Přidat</Button>
                  </DialogFooter>
                </AutoForm>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}
      <SpinnerContainer loading={contactsQuery.isLoading}>
        <Table>
          {(contactsQuery.data?.length ?? 0) > 1 && (
            <TableCaption>
              Celkem {contactsQuery.data?.length} kontakty
            </TableCaption>
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
                  <Link href={`/contacts/${contact.id}`}>{contact.name}</Link>
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
