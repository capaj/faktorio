import { Button } from '@/components/ui/button'
import { Link } from 'wouter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucidePiggyBank, LucideTwitter } from 'lucide-react'
import { MountainIcon } from '@/components/MountainIcon'
import { Footer, PageShell } from './PageShell'

export const LandingPage = () => {
  return (
    <>
      <div>
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
              <Link href="/signup">
                <Button className="w-full" type="submit">
                  Registrace
                </Button>
              </Link>

              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                Zkuste to. Zabere to minutu a je to zdarma. Navždy.
              </p>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24">
          <div className="container grid items-center gap-4 px-4 md:px-6">
            <img
              alt="Image"
              className="mx-auto  overflow-hidden  rounded-xl  sm:w-full sm:h-[1100px]"
              height="1310"
              src="/faktura.png"
            />
            <div className="flex flex-col gap-2 min-[400px]:flex-col">
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-row gap-4">
                    <MountainIcon className="h-6 w-6" />
                    <h2>
                      Faktorio.cz - nabízí jen to co malý podnikatel potřebuje.
                    </h2>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  Faktorio.cz - platforma, která je přesně tím, co malý
                  podnikatel potřebuje. Faktorio.cz má minimalistickou vizi:
                  jednoduché, intuitivní a levné řešení pro vystavování faktur.
                  S Faktorio.cz můžete vystavit fakturu kdykoliv a odkudkoliv,
                  bez kreditky během několika vteřin po registraci.{' '}
                  <Link href="/manifest" className={'flex justify-end'}>
                    <p className="text-xl mt-3">
                      Celý manifest faktorio.cz si můžete přečíst zde.
                    </p>
                  </Link>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-row gap-4">
                    <LucidePiggyBank size={30} />
                    <h2>Co to stojí?</h2>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  Provoz celé aplikace faktorio.cz na rok momentálně stojí méně,
                  než cena jednoho měsíčního předplatného fakturoid.cz nebo
                  idoklad.cz. Dokud to půjde, bude Faktorio.cz zdarma. Pokud by
                  se náklady na provoz razantně zvýšily nejspíš přidám do
                  aplikace reklamu a možnost reklamu odstranit za drobný
                  poplatek-například 500 kč ročně.
                  <p className="mt-3">
                    Přispět na provoz faktorio.cz můžete zasláním peněz na můj{' '}
                    <a
                      className="text-accent underline underline-offset-2 bg-accent text-black"
                      href="https://revolut.me/capaj"
                    >
                      revolut účet
                    </a>
                    <br />
                    Nezapomeňte uvést do poznámky faktorio.cz
                  </p>
                  <p className="mt-3">
                    Preferujete-li kryptoměnu, můžete mi poslat litecoin na
                    adresu: LKpED8uFA2tj8da8JYNEGWCUNjorEbetrQ
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Chcete se podílet na faktorio.cz?</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center">
                    <p>
                      Faktorio je open-source a rád uvítám další maintainery.
                      Pokud by někdy faktorio mělo mít byť jen nepatrný zisk,
                      bude zisk rozdělen mezi všechny přispěvatele podle
                      velikosti jejich příspěvku. Zajímá-li jak by se velikost
                      vašeho příspevku počítala, podívejte se na{' '}
                      <a href="https://github.com/capaj/contrib-locs">
                        <Button variant={'link'}>projekt contrib-locs</Button>
                      </a>
                    </p>

                    <p>
                      Autor:
                      <a
                        href="https://twitter.com/capajj"
                        className={'text-xl'}
                      >
                        <Button variant={'link'}>
                          <LucideTwitter></LucideTwitter> @capajj
                        </Button>
                      </a>
                    </p>
                  </div>
                  <p>
                    Tech stack projektu je:
                    <ul className="ml-4">
                      <li>Typescript</li>
                      <li>React.js</li>
                      <li>Drizzle ORM</li>
                      <li>TRPC</li>
                      <li>Turso</li>
                      <li>Shadcn</li>
                      <li>Cloudflare workers</li>
                    </ul>
                  </p>
                  <p className="mt-3">
                    Jste programátor a chcete se podílet na vývoji, neváhejte{' '}
                    <a href="https://github.com/capaj/faktorio">
                      forknout na GH
                    </a>
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
