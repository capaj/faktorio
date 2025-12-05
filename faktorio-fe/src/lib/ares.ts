import { z } from 'zod/v4'

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

export type AresBusinessInformation = z.infer<typeof AresBusinessInformationSchema>

export const formatStreetAddress = (aresData: AresBusinessInformation) => {
  const streetName =
    aresData.sidlo.nazevUlice ?? aresData.sidlo.nazevCastiObce ?? ''
  const houseNumber = aresData.sidlo.cisloDomovni
  const orientationNumber = aresData.sidlo.cisloOrientacni
    ? `/${aresData.sidlo.cisloOrientacni}`
    : ''

  return `${streetName} ${houseNumber}${orientationNumber}`
}
