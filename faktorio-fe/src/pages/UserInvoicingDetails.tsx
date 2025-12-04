import { ContactForm } from './ContactList/ContactForm'
import { trpcClient, RouterInputs, RouterOutputs } from '@/lib/trpcClient'
import { bankAccountInputSchema } from 'faktorio-api/src/zodDbSchemas'
import { FkButton } from '@/components/FkButton'
import { toast } from 'sonner'
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'
import {
  CompanyRegistry,
  fetchCompanyFromRegistry,
  registryLabels,
  RegistryCompanyData
} from '@/lib/companyRegistries'
import {
  useForm,
  useFieldArray,
  useWatch,
  Control,
  Controller
} from 'react-hook-form'
import { zodResolver } from '@/lib/zodResolver'
import { z } from 'zod/v4'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import jsQR from 'jsqr-es6'
import { useQRCodeBase64 } from '@/lib/useQRCodeBase64'

const bankAccountFormSchema = bankAccountInputSchema.extend({
  is_default: z.union([z.boolean(), z.string(), z.number()]).optional(),
  order: z.union([z.number(), z.string()]).optional()
})

const invoicingDetailsFormSchema = z.object({
  registration_no: z.string().optional(),
  name: z.string().min(1, 'Jméno je povinné'),
  vat_no: z.string().optional(),
  street: z.string().min(1, 'Ulice je povinná'),
  street2: z.string().optional(),
  city: z.string().min(1, 'Město je povinné'),
  zip: z.string().min(1, 'PSČ je povinné'),
  country: z.string().min(1, 'Země je povinná'),
  main_email: z.string().optional(),
  phone_number: z.string().optional(),
  web_url: z.string().optional(),
  language: z.string().optional(),
  vat_payer: z.boolean().optional().default(true),
  bank_accounts: z.array(bankAccountFormSchema)
})

export type InvoicingDetailsFormSchema = z.infer<
  typeof invoicingDetailsFormSchema
>

type BankAccountFormValues = z.infer<typeof bankAccountFormSchema>
type BankAccountInput = Required<
  RouterInputs['upsertInvoicingDetails']
>['bank_accounts'][number]
type BankAccountServer = Required<
  NonNullable<RouterOutputs['invoicingDetails']>
>['bankAccounts'][number]

const toOptionalString = (value?: string | null) => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') return value === 'true'
  return false
}

const createEmptyBankAccount = (order: number): BankAccountFormValues => ({
  id: undefined,
  label: '',
  bank_account: '',
  iban: '',
  swift_bic: '',
  qrcode_decoded: '',
  is_default: order === 0,
  order
})

const mapAccountFromServer = (account: BankAccountServer): BankAccountFormValues => ({
  id: toOptionalString(account.id),
  label: account.label ?? '',
  bank_account: account.bank_account ?? '',
  iban: account.iban ?? '',
  swift_bic: account.swift_bic ?? '',
  qrcode_decoded: account.qrcode_decoded ?? '',
  is_default: toBoolean(account.is_default),
  order: account.order ?? 0
})

const ensureConsistentBankAccounts = (
  accounts: BankAccountFormValues[]
): BankAccountFormValues[] => {
  if (!accounts.length) return []

  const normalized = accounts.map((account, index) => ({
    ...account,
    order: index,
    is_default: toBoolean(account.is_default)
  }))

  let defaultIndex = normalized.findIndex((account) => toBoolean(account.is_default))
  if (defaultIndex === -1) {
    defaultIndex = 0
  }

  return normalized.map((account, index) => ({
    ...account,
    is_default: index === defaultIndex
  }))
}

const hasBankAccountContent = (account: BankAccountFormValues): boolean => {
  return (
    Boolean(account.label && account.label.trim()) ||
    Boolean(account.bank_account && account.bank_account.trim()) ||
    Boolean(account.iban && account.iban.trim()) ||
    Boolean(account.swift_bic && account.swift_bic.trim()) ||
    Boolean(account.qrcode_decoded && account.qrcode_decoded.trim())
  )
}

const prepareAccountsForSubmit = (
  accounts: BankAccountFormValues[]
): BankAccountInput[] => {
  const filtered = accounts.filter(hasBankAccountContent)
  if (!filtered.length) {
    return []
  }

  const withOrder = filtered.map((account, index) => ({
    ...account,
    order: index,
    is_default: toBoolean(account.is_default)
  }))

  let defaultIndex = withOrder.findIndex((account) => account.is_default)
  if (defaultIndex === -1) {
    defaultIndex = 0
  }

  return withOrder.map((account, index) => ({
    id: toOptionalString(account.id) ?? undefined,
    label: toOptionalString(account.label),
    bank_account: toOptionalString(account.bank_account),
    iban: toOptionalString(account.iban),
    swift_bic: toOptionalString(account.swift_bic),
    qrcode_decoded: toOptionalString(account.qrcode_decoded),
    is_default: index === defaultIndex,
    order: index
  }))
}

type BarcodeDetectorResult = {
  rawValue?: string
}

type BarcodeDetectorConstructor = new (
  options?: { formats?: string[] }
) => {
  detect: (source: ImageBitmap) => Promise<BarcodeDetectorResult[]>
}

const tryDecodeUsingBarcodeDetector = async (
  file: File
): Promise<string | null> => {
  if (typeof window === 'undefined') return null
  const barcodeDetectorCtor = (window as typeof window & {
    BarcodeDetector?: BarcodeDetectorConstructor
  }).BarcodeDetector
  if (!barcodeDetectorCtor) return null

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file)
    const detector = new barcodeDetectorCtor({ formats: ['qr_code'] })
    const results = await detector.detect(bitmap)
    const value = results[0]?.rawValue
    return value && value.length ? value : null
  } catch (error) {
    console.warn('BarcodeDetector decode failed', error)
    return null
  } finally {
    bitmap?.close()
  }
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
    img.src = src
  })

const readImageData = async (file: File) => {
  const url = URL.createObjectURL(file)
  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height

    if (!context || !width || !height) {
      throw new Error('Canvas not supported')
    }

    canvas.width = width
    canvas.height = height
    context.drawImage(image, 0, 0)
    return context.getImageData(0, 0, width, height)
  } finally {
    URL.revokeObjectURL(url)
  }
}

const decodeQrWithJsQR = async (file: File): Promise<string | null> => {
  try {
    const imageData = await readImageData(file)
    const result = jsQR(imageData.data, imageData.width, imageData.height)
    return result?.data ?? null
  } catch (error) {
    console.error('jsQR decode failed', error)
    return null
  }
}

const decodeQrFromFile = async (file: File): Promise<string | null> => {
  const barcodeValue = await tryDecodeUsingBarcodeDetector(file)
  if (barcodeValue) {
    return barcodeValue
  }

  return decodeQrWithJsQR(file)
}

type BankAccountCardProps = {
  index: number
  account: BankAccountFormValues
  fieldId: string
  control: Control<InvoicingDetailsFormSchema>
  onRemove: () => void
  onSetDefault: () => void
  onQrUpload: (file: File) => Promise<void>
  isDefault: boolean
  disableActions: boolean
}

const BankAccountCard = ({
  index,
  account,
  fieldId,
  control,
  onRemove,
  onSetDefault,
  onQrUpload,
  isDefault,
  disableActions
}: BankAccountCardProps) => {
  const qrCodeBase64 = useQRCodeBase64(
    account.qrcode_decoded && account.qrcode_decoded.length
      ? account.qrcode_decoded
      : null
  )

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await onQrUpload(file)
    }
    event.target.value = ''
  }

  return (
    <div className="rounded-md border border-border bg-background p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">Bankovní účet {index + 1}</span>
          {isDefault && (
            <span className="text-xs font-semibold text-emerald-600">
              Výchozí
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={isDefault ? 'secondary' : 'outline'}
            onClick={onSetDefault}
            disabled={disableActions || isDefault}
          >
            {isDefault ? 'Výchozí účet' : 'Nastavit jako výchozí'}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onRemove}
            disabled={disableActions}
          >
            Odstranit
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${fieldId}-label`}>Popis / název</Label>
          <Controller
            control={control}
            name={`bank_accounts.${index}.label`}
            render={({ field }) => (
              <Input
                id={`${fieldId}-label`}
                placeholder="Např. Revolut CZ"
                disabled={disableActions}
                {...field}
              />
            )}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${fieldId}-bank-account`}>
            Číslo bankovního účtu
          </Label>
          <Controller
            control={control}
            name={`bank_accounts.${index}.bank_account`}
            render={({ field }) => (
              <Input
                id={`${fieldId}-bank-account`}
                placeholder="123456789/0100"
                disabled={disableActions}
                {...field}
              />
            )}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${fieldId}-iban`}>IBAN</Label>
          <Controller
            control={control}
            name={`bank_accounts.${index}.iban`}
            render={({ field }) => (
              <Input
                id={`${fieldId}-iban`}
                placeholder="CZ..."
                disabled={disableActions}
                {...field}
              />
            )}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${fieldId}-swift`}>SWIFT / BIC</Label>
          <Controller
            control={control}
            name={`bank_accounts.${index}.swift_bic`}
            render={({ field }) => (
              <Input
                id={`${fieldId}-swift`}
                placeholder="REVOLT21"
                disabled={disableActions}
                {...field}
              />
            )}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${fieldId}-qr-text`}>
          Načtený text z QR kódu (je možné upravit)
        </Label>
        <Controller
          control={control}
          name={`bank_accounts.${index}.qrcode_decoded`}
          render={({ field }) => (
            <Textarea
              id={`${fieldId}-qr-text`}
              rows={4}
              disabled={disableActions}
              placeholder="Text, který je uložen v QR kódu"
              {...field}
            />
          )}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="space-y-1">
          <Label htmlFor={`${fieldId}-qr-upload`}>
            Nahrát obrázek s QR kódem
          </Label>
          <Input
            id={`${fieldId}-qr-upload`}
            type="file"
            accept="image/*"
            disabled={disableActions}
            onChange={handleFileChange}
          />
        </div>
        {account.qrcode_decoded && qrCodeBase64 && (
          <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
            <img
              src={qrCodeBase64}
              alt={`QR kód pro účet ${index + 1}`}
              className="h-28 w-28 rounded border"
            />
            <span>QR kód generovaný z uloženého textu</span>
          </div>
        )}
      </div>
    </div>
  )
}

export const UserInvoicingDetails = () => {
  const [data, { refetch }] = trpcClient.invoicingDetails.useSuspenseQuery()
  const upsert = trpcClient.upsertInvoicingDetails.useMutation()

  const [isLoadingRegistry, setIsLoadingRegistry] = useState(false)
  const [registrySource, setRegistrySource] = useState<CompanyRegistry>('ares')

  const accountsFromServer = useMemo(() => {
    const accounts = data?.bankAccounts ?? []
    if (!accounts.length) {
      return []
    }

    return ensureConsistentBankAccounts(
      accounts.map((account) => mapAccountFromServer(account))
    )
  }, [data])

  const defaultBankAccounts =
    accountsFromServer.length > 0
      ? accountsFromServer
      : [createEmptyBankAccount(0)]

  const form = useForm<InvoicingDetailsFormSchema>({
    resolver: zodResolver(invoicingDetailsFormSchema),
    defaultValues: {
      registration_no: data?.registration_no ?? '',
      name: data?.name ?? '',
      vat_no: data?.vat_no ?? '',
      street: data?.street ?? '',
      street2: data?.street2 ?? '',
      city: data?.city ?? '',
      zip: data?.zip ?? '',
      country: data?.country || 'Česká Republika',
      main_email: data?.main_email ?? '',
      phone_number: data?.phone_number ?? '',
      web_url: data?.web_url ?? '',
      vat_payer: data?.vat_payer ?? true,
      language: 'cs',
      bank_accounts: defaultBankAccounts
    }
  })

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'bank_accounts'
  })

  useEffect(() => {
    const preparedAccounts =
      accountsFromServer.length > 0
        ? accountsFromServer
        : [createEmptyBankAccount(0)]

    form.reset({
      registration_no: data?.registration_no ?? '',
      name: data?.name ?? '',
      vat_no: data?.vat_no ?? '',
      street: data?.street ?? '',
      street2: data?.street2 ?? '',
      city: data?.city ?? '',
      zip: data?.zip ?? '',
      country: data?.country || 'Česká Republika',
      main_email: data?.main_email ?? '',
      phone_number: data?.phone_number ?? '',
      web_url: data?.web_url ?? '',
      vat_payer: data?.vat_payer ?? true,
      language: 'cs',
      bank_accounts: preparedAccounts
    })

    replace(preparedAccounts)
  }, [accountsFromServer, data, form, replace])

  const updateAccounts = useCallback(
    (next: BankAccountFormValues[]) => {
      const normalized = ensureConsistentBankAccounts(next)
      replace(normalized.length ? normalized : [])
      form.setValue('bank_accounts', normalized.length ? normalized : [], {
        shouldDirty: true,
        shouldTouch: true
      })
    },
    [form, replace]
  )

  const handleAddAccount = useCallback(() => {
    const current = form.getValues('bank_accounts')
    const nextAccount = createEmptyBankAccount(current.length)
    updateAccounts([...current, nextAccount])
  }, [form, updateAccounts])

  const handleRemoveAccount = useCallback(
    (index: number) => {
      const current = form.getValues('bank_accounts')
      const next = current.filter((_, idx) => idx !== index)
      updateAccounts(next)
    },
    [form, updateAccounts]
  )

  const handleSetDefaultAccount = useCallback(
    (index: number) => {
      const current = form.getValues('bank_accounts')
      updateAccounts(
        current.map((account, idx) => ({
          ...account,
          is_default: idx === index
        }))
      )
    },
    [form, updateAccounts]
  )

  const handleQrUpload = useCallback(
    async (index: number, file: File) => {
      try {
        const decoded = await decodeQrFromFile(file)
        if (!decoded) {
          toast.error('Nepodařilo se načíst QR kód. Zkuste prosím jiný obrázek.')
          return
        }

        form.setValue(`bank_accounts.${index}.qrcode_decoded`, decoded, {
          shouldDirty: true,
          shouldTouch: true
        })
        toast.success('QR kód byl úspěšně načten a uložen do formuláře')
      } catch (error) {
        console.error('QR decode error', error)
        toast.error('Při zpracování QR kódu nastala chyba')
      }
    },
    [form]
  )

  const handleCompanyDataFetched = (data: RegistryCompanyData) => {
    if (data.name !== undefined) form.setValue('name', data.name ?? '')
    if (data.street !== undefined) form.setValue('street', data.street ?? '')
    if (data.street2 !== undefined) form.setValue('street2', data.street2 ?? '')
    if (data.city !== undefined) form.setValue('city', data.city ?? '')
    if (data.zip !== undefined) form.setValue('zip', data.zip ?? '')
    if (data.vat_no !== undefined) form.setValue('vat_no', data.vat_no ?? '')
    if (data.country !== undefined)
      form.setValue('country', data.country ?? 'Česká Republika')
  }

  const fetchRegistryData = async () => {
    const registrationNo = form.getValues('registration_no')
    if (!registrationNo || registrationNo.length !== 8) return

    setIsLoadingRegistry(true)
    try {
      const registryData = await fetchCompanyFromRegistry(
        registrySource,
        registrationNo
      )
      handleCompanyDataFetched(registryData)
      toast.success(
        `Údaje z ${registryLabels[registrySource]} byly úspěšně načteny`
      )
    } catch (error) {
      console.error('Registry fetch error:', error)
      toast.error(
        `Nepodařilo se načíst údaje z ${registryLabels[registrySource]}`
      )
    } finally {
      setIsLoadingRegistry(false)
    }
  }

  const handleSubmit = async (values: InvoicingDetailsFormSchema) => {
    const accounts = prepareAccountsForSubmit(values.bank_accounts)
    const payload: RouterInputs['upsertInvoicingDetails'] = {
      ...values,
      bank_accounts: accounts
    }
    await upsert.mutateAsync(payload)
    await refetch()
    toast.success('Údaje byly úspěšně uloženy')
  }

  const isDirty = form.formState.isDirty
  const bankAccounts =
    useWatch({ control: form.control, name: 'bank_accounts' }) ?? []

  const copyDetailsToClipboard = async () => {
    const currentValues = form.getValues()
    const baseLines = [
      `Jméno: ${currentValues?.name ?? ''}`,
      `IČO: ${currentValues?.registration_no ?? ''}`,
      `DIČ: ${currentValues?.vat_no ?? ''}`,
      `Ulice: ${currentValues?.street ?? ''}`,
      `Část obce: ${currentValues?.street2 ?? ''}`,
      `Město: ${currentValues?.city ?? ''}`,
      `PSČ: ${currentValues?.zip ?? ''}`,
      `Země: ${currentValues?.country ?? ''}`,
      `Telefon: ${currentValues?.phone_number ?? ''}`,
      `Email: ${currentValues?.main_email ?? ''}`,
      `Web: ${currentValues?.web_url ?? ''}`
    ].filter((line) => line.split(': ')[1])

    const accountsForCopy = prepareAccountsForSubmit(
      currentValues.bank_accounts ?? []
    )

    accountsForCopy.forEach((account, index) => {
      baseLines.push(``)
      baseLines.push(
        `Bankovní účet ${index + 1}${account.is_default ? ' (výchozí)' : ''}`
      )
      if (account.label) {
        baseLines.push(`Název: ${account.label}`)
      }
      if (account.bank_account) {
        baseLines.push(`Číslo účtu: ${account.bank_account}`)
      }
      if (account.iban) {
        baseLines.push(`IBAN: ${account.iban}`)
      }
      if (account.swift_bic) {
        baseLines.push(`SWIFT/BIC: ${account.swift_bic}`)
      }
      if (account.qrcode_decoded) {
        baseLines.push(`QR payload: ${account.qrcode_decoded}`)
      }
    })

    const details = baseLines.join('\n').trim()
    if (!details.length) {
      toast.error('Není co kopírovat – vyplňte prosím alespoň jednu hodnotu')
      return
    }

    await navigator.clipboard.writeText(details)
    toast.success('Údaje zkopírovány do schránky')
  }

  return (
    <>
      <h2>Moje fakturační údaje</h2>
      <p className="text-xs text-muted-foreground">
        Zde zadejte údaje, které se budou zobrazovat na fakturách, které
        vytvoříte.
      </p>
      <div className="mt-5 flex flex-col">
        <ContactForm
          displayVatPayer
          form={form}
          onSubmit={handleSubmit}
          showInvoicingFields
          showBankingFields={false}
          showDialogFooter={false}
          isLoadingRegistry={isLoadingRegistry}
          onFetchRegistry={fetchRegistryData}
          registrySource={registrySource}
          onRegistrySourceChange={setRegistrySource}
          customFooter={
            <div className="col-span-2 space-y-6">
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">Bankovní účty</h3>
                  <FkButton type="button" variant="secondary" onClick={handleAddAccount}>
                    Přidat bankovní účet
                  </FkButton>
                </div>

                {bankAccounts.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
                    Zatím nemáte žádný bankovní účet. Přidejte ho pomocí tlačítka
                    výše.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <BankAccountCard
                        key={field.id}
                        index={index}
                        account={
                          bankAccounts[index] ?? createEmptyBankAccount(index)
                        }
                        fieldId={field.id}
                        control={form.control}
                        onRemove={() => handleRemoveAccount(index)}
                        onSetDefault={() => handleSetDefaultAccount(index)}
                        onQrUpload={(file) => handleQrUpload(index, file)}
                        isDefault={toBoolean(bankAccounts[index]?.is_default)}
                        disableActions={upsert.isPending}
                      />
                    ))}
                  </div>
                )}
              </section>

              <div className="flex flex-wrap justify-between gap-2">
                <FkButton
                  type="button"
                  variant="outline"
                  onClick={copyDetailsToClipboard}
                >
                  Kopírovat všechny údaje do schránky
                </FkButton>
                <FkButton
                  disabled={!isDirty}
                  isLoading={upsert.isPending}
                  type="submit"
                >
                  Uložit
                </FkButton>
              </div>
            </div>
          }
        />
      </div>
    </>
  )
}
