import { ButtonLink } from '@/components/ui/link'
import { useWindowSize } from 'usehooks-ts'

export const PageShell = ({ children }: { children: React.ReactNode }) => {
  const screen = useWindowSize()
  console.log('screen:', screen)
  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: screen.height - 90
      }}
    >
      <div className="flex-grow container mx-auto px-4 py-6 md:py-12 lg:py-16 xl:py-24 overflow-y-auto overflow-x-hidden">
        {children}
      </div>
      <Footer />
    </div>
  )
}

export function Footer() {
  return (
    <footer className="mt-auto">
      <div className="flex justify-center px-4 py-4">
        <a
          href="https://czechlaunch.cz/project/faktorio?ref=badge"
          target="_blank"
          rel="noopener"
          className="inline-block"
        >
          <img
            src="https://czechlaunch.cz/badges/launched-v3-en-light.svg"
            alt="Launched on CzechLaunch"
            width="228"
            height="54"
          />
        </a>
      </div>
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
        <div className="text-center text-sm text-fg-subtle">
          © {new Date().getFullYear()} Faktorio
        </div>
      </div>
    </footer>
  )
}
