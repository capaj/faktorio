import { Button } from '@/components/ui/button'
import { SignInButton } from '@clerk/clerk-react'
import { Link } from 'wouter'

export const LandingPage = () => {
  return (
    <>
      <section className="w-full py-6 md:py-12 lg:py-16 xl:py-24">
        <div className="container flex flex-col items-center justify-center space-y-2 px-4 md:px-6 text-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
              Fakturujte. Jednoduše.
            </h1>
            <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              Nejsnadnější způsob, jak vytvářet faktury.
            </p>
          </div>
          <div className="mx-auto max-w-[400px] space-y-2">
            <SignInButton>
              <Button className="w-full" type="submit">
                Registrace
              </Button>
            </SignInButton>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Zaregistrujte se. Je to zdarma. Navždy.
            </p>
          </div>
        </div>
      </section>
      <section className="w-full py-12 md:py-24">
        <div className="container grid items-center gap-4 px-4 md:px-6">
          <img
            alt="Image"
            className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full"
            height="310"
            src="/placeholder.svg"
            width="550"
          />
          <div className="flex flex-col gap-2 min-[400px]:flex-col">
            Jako živnostník stojící na prahu podnikání jsem čelil jednoduchému,
            přesto však zdánlivě neřešitelnému dilematu: potřeba vystavovat
            jednu fakturu měsíčně bez zbytečných komplikací a vysokých nákladů.
            Tento zdánlivě malý požadavek se po 15 letech stal mým každodenním
            bojem. Na trhu jsem sice našel řadu řešení, ale všechna přicházela s
            nepřiměřenými cenami nebo složitostmi, které přesahovaly mé skromné
            požadavky. Platit 175 Kč měsíčně za vystavení jedné jediné faktury
            se mi zdálo značně nespravedlivé. Tato frustrující zkušenost mě
            přivedla k otázce: Co kdyby existovalo řešení, které by bylo
            speciálně navržené pro malé podnikatele jako jsem já? Řešení, které
            by bylo jednoduché, cenově dostupné a zbavené všech zbytečných
            složitostí? S touto myšlenkou jsem se pustil do práce a výsledkem je
            <p>
              Faktorio.cz - platforma, která je přesně tím, co malý podnikatel
              potřebuje. Faktorio.cz je ztělesněním mé vize: jednoduché,
              intuitivní a cenově dostupné řešení pro vystavování faktur. Již
              žádné přemrštěné měsíční poplatky za základní služby. S
              Faktorio.cz můžete vystavit fakturu kdykoliv a odkudkoliv, bez
              kreditky během několika vteřin po registraci.
            </p>
            <p>
              Provoz faktorio.cz stojí méně, než stojí předplatné fakturoid.cz
              nebo idoklad.cz a dokud to půjde, bude Faktorio.cz zdarma.
            </p>
            <div className='flex flex-col items-center'>
              
              <a href="https://twitter.com/capajj" className={'text-xl'}>
                <Button variant={'link'}>
                Pokud jste programátor a chcete se podílet na vývoji, neváhejte mě{' '}
                  kontaktovat
                  </Button>
              
              </a>Faktorio sice není open-source, ale rád uvítám
              další maintainery.
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
