import { Check, X } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const features = [
  {
    name: 'Generování PDF faktur',
    faktorio: true,
    fakturovac: true,
    fakturoid: true,
    idoklad: true,
  },
  {
    name: 'Extrakce faktury z rastrového obrázku',
    faktorio: true,
    fakturovac: false,
    fakturoid: false,
    idoklad: false,
  },
  {
    name: 'Vyhledávání ve fakturách',
    faktorio: true,
    fakturovac: true,
    fakturoid: true,
    idoklad: true,
  },
  {
    name: 'Správa kontaktů (integrace s ARES)',
    faktorio: true,
    fakturovac: true,
    fakturoid: true,
    idoklad: true,
  },
  {
    name: 'Podpora cizích měn',
    faktorio: true,
    fakturovac: false,
    fakturoid: true,
    idoklad: true,
  },
  {
    name: 'Export faktur do Excel, CSV, ISDOC',
    faktorio: true,
    fakturovac: true,
    fakturoid: true,
    idoklad: true,
  },
  {
    name: 'Export faktur do XML pro úřady',
    faktorio: true,
    fakturovac: true,
    fakturoid: true,
    idoklad: true,
  },
  {
    name: 'Odesílání faktur emailem z aplikace',
    faktorio: false,
    fakturovac: true,
    fakturoid: true,
    idoklad: true,
  },
  {
    name: 'API pro integrace',
    faktorio: true,
    fakturovac: false,
    fakturoid: true,
    idoklad: true,
  },
  {
    name: 'Push notifikace ve webové aplikaci',
    faktorio: true,
    fakturovac: false,
    fakturoid: false,
    idoklad: false,
  },
  {
    name: 'Mobilní aplikace',
    faktorio: false,
    fakturovac: false,
    fakturoid: true,
    idoklad: true,
  },
  {
    name: 'Anglické UI',
    faktorio: false,
    fakturovac: false,
    fakturoid: true,
    idoklad: true,
  },
  {
    name: 'Vykreslování faktur v angličtině',
    faktorio: true,
    fakturovac: false,
    fakturoid: true,
    idoklad: true,
  },
  {
    name: 'Podpora přenesené daňové povinnosti (tuzemské i zahraniční)',
    faktorio: true,
    fakturovac: false,
    fakturoid: true,
    idoklad: true,
  },
  {
    name: 'Sdílení faktury veřejným odkazem',
    faktorio: true,
    fakturovac: false,
    fakturoid: true,
    idoklad: true,
  },
  {
    name: 'Více bankovních účtů',
    faktorio: true,
    fakturovac: true,
    fakturoid: true,
    idoklad: true,
  },
  {
    name: 'Lokální běh bez odesílání dat na cloud',
    faktorio: true,
    fakturovac: false,
    fakturoid: false,
    idoklad: false,
  },
]

export const FeatureComparison = () => {
  return (
    <Card className="w-full max-w-5xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <CardHeader>
        <CardTitle className="text-2xl md:text-3xl text-center">
          Srovnání funkcí
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px] sm:w-[300px] sticky left-0 bg-card z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] px-2 sm:px-4">
                Funkce
              </TableHead>
              <TableHead className="text-center font-bold text-primary min-w-[100px] sm:min-w-[120px] px-2 sm:px-4">
                Faktorio.cz
              </TableHead>
              <TableHead className="text-center text-muted-foreground min-w-[100px] sm:min-w-[120px] px-2 sm:px-4">
                Fakturovac.cz
              </TableHead>
              <TableHead className="text-center text-muted-foreground min-w-[100px] sm:min-w-[120px] px-2 sm:px-4">
                Fakturoid.cz
              </TableHead>
              <TableHead className="text-center text-muted-foreground min-w-[100px] sm:min-w-[120px] px-2 sm:px-4">
                iDoklad.cz
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {features.map((feature, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium sticky left-0 bg-card z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] p-2 sm:p-4 text-xs sm:text-sm">
                  {feature.name}
                </TableCell>
                <TableCell className="text-center bg-primary/5 p-2 sm:p-4">
                  {feature.faktorio ? (
                    <Check className="mx-auto h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  ) : (
                    <X className="mx-auto h-4 w-4 sm:h-5 sm:w-5 text-red-400 opacity-50" />
                  )}
                </TableCell>
                <TableCell className="text-center p-2 sm:p-4">
                  {feature.fakturovac ? (
                    <Check className="mx-auto h-4 w-4 sm:h-5 sm:w-5 text-green-600 opacity-70" />
                  ) : (
                    <X className="mx-auto h-4 w-4 sm:h-5 sm:w-5 text-red-400 opacity-30" />
                  )}
                </TableCell>
                <TableCell className="text-center p-2 sm:p-4">
                  {feature.fakturoid ? (
                    <Check className="mx-auto h-4 w-4 sm:h-5 sm:w-5 text-green-600 opacity-70" />
                  ) : (
                    <X className="mx-auto h-4 w-4 sm:h-5 sm:w-5 text-red-400 opacity-30" />
                  )}
                </TableCell>
                <TableCell className="text-center p-2 sm:p-4">
                  {feature.idoklad ? (
                    <Check className="mx-auto h-4 w-4 sm:h-5 sm:w-5 text-green-600 opacity-70" />
                  ) : (
                    <X className="mx-auto h-4 w-4 sm:h-5 sm:w-5 text-red-400 opacity-30" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground mt-4 text-center px-4 pb-4 sm:px-0 sm:pb-0">
          Poznámka: Informace o funkcích Fakturoid.cz a iDoklad.cz vycházejí z
          běžných komerčních nabídek a mohou vyžadovat ověření.
        </p>
      </CardContent>
    </Card>
  )
}
