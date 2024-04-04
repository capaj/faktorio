import { ButtonLink } from '@/components/ui/link'
import { useScreen, useWindowSize } from 'usehooks-ts'

export const PageShell = ({ children }) => {
  const screen = useWindowSize()
  console.log('screen:', screen)
  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: screen.height - 90
      }}
    >
      <div className="flex-grow container mx-auto px-4 py-6 md:py-12 lg:py-16 xl:py-24">
        {children}
      </div>
      <footer className="mt-auto">
        <div className="container flex flex-col md:flex-row items-center justify-center md:gap-4 px-4 text-center md:px-6">
          <ButtonLink
            className="text-sm font-semibold underline underline-offset-2 hover:underline-dotted transition-colors"
            href="/privacy"
          >
            Zásady ochrany osobních údajů
          </ButtonLink>
          <ButtonLink
            className="text-sm font-semibold underline underline-offset-2 hover:underline-dotted transition-colors"
            href="/terms-of-service"
          >
            Obchodní podmínky
          </ButtonLink>
        </div>
        <div className="container mx-auto p-4">
          <div className="text-center text-sm text-gray-600">
            © {new Date().getFullYear()} Faktorio
          </div>
        </div>
      </footer>
    </div>
  )
}
