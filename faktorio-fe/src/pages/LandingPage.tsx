import { Button } from '@/components/ui/button'
import { Link } from 'wouter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LucidePiggyBank,
  LucideTwitter,
  Users,
  FileText,
  LucideGithub
} from 'lucide-react'
import { MountainIcon } from '@/components/MountainIcon'
import { Footer } from './PageShell'
import { ButtonLink } from '@/components/ui/link'
import { Separator } from '@/components/ui/separator'
import { trpcClient } from '@/lib/trpcClient'
import { FeatureComparison } from '@/components/FeatureComparison'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'

export const LandingPage = () => {
  const { data: systemStats } = trpcClient.systemStats.useQuery(undefined, {
    staleTime: 24 * 60 * 60 * 1000 // 24 hours
  })

  return (
    <>
      <div>
        <section className="w-full py-6 md:py-12 lg:py-16 xl:py-24 animate-in fade-in zoom-in-95 duration-700">
          <div className="container flex flex-col items-center justify-center space-y-4 px-2 md:px-6 text-center">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 pb-2">
                Fakturace bez zbytečností.
              </h1>
              <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                Moderní, rychlý a otevřený nástroj pro živnostníky a malé firmy.
                Vystavujte faktury zdarma, bezpečně a s radostí.
              </p>
            </div>

            <div className="mx-auto max-w-[400px] space-y-4 pt-4">
              <Link href="/signup">
                <Button
                  className="w-full h-12 text-lg transition-all hover:scale-105 shadow-lg"
                  type="submit"
                  role="link"
                  aria-label="Registrace"
                >
                  Začít fakturovat zdarma
                </Button>
              </Link>

              <p className="text-xs text-center text-muted-foreground mt-2">
                Registrace zabere méně než minutu. Žádné skryté poplatky.
              </p>
              <Separator className="my-4" />
              <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2">
                Nechcete svoje data posílat na cloud? Je pro vás soukromí na
                prvním místě a rád si zálohujete data sám?
              </p>

              <ButtonLink
                href="/local-dbs"
                variant="secondary"
                className="text-sm font-medium hover:underline underline-offset-4"
              >
                Spustit s lokální databází
              </ButtonLink>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24">
          <div className="container grid items-start gap-8 px-2 md:px-6 lg:grid-cols-5">
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative group animate-in slide-in-from-left-8 duration-700 delay-200 lg:col-span-3 cursor-zoom-in">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></div>
                  <img
                    alt="Náhled faktury"
                    className="relative mx-auto rounded-xl object-contain w-full shadow-2xl border border-border/50"
                    src="/faktura.png"
                  />
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 border-none bg-transparent shadow-none block overflow-auto outline-none [&>button]:hidden">
                <img
                  alt="Náhled faktury"
                  className="max-w-none min-w-[150vw] md:min-w-0 md:max-w-full md:max-h-[95vh] rounded-lg shadow-2xl mx-auto"
                  src="/faktura.png"
                />
              </DialogContent>
            </Dialog>
            <div className="flex flex-col gap-6 animate-in slide-in-from-right-8 duration-700 delay-300 lg:col-span-2">
              {systemStats && (
                <Card className="overflow-hidden border-none shadow-lg bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                        <Users className="h-8 w-8 text-blue-500 mb-2" />
                        <div className="text-center">
                          <div className="text-3xl font-bold tracking-tight">
                            {Math.ceil(systemStats.user_count / 10) * 10}+
                          </div>
                          <div className="text-sm text-muted-foreground font-medium">
                            aktivních uživatelů
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                        <FileText className="h-8 w-8 text-green-500 mb-2" />
                        <div className="text-center">
                          <div className="text-3xl font-bold tracking-tight">
                            {Math.ceil(systemStats.invoice_count / 10) * 10}+
                          </div>
                          <div className="text-sm text-muted-foreground font-medium">
                            vystavených faktur
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card className="hover:shadow-md transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex flex-row items-center gap-3 text-xl">
                    <MountainIcon className="h-6 w-6 text-primary" />
                    <h2>Vše co potřebujete, nic navíc</h2>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground leading-relaxed">
                  <p>
                    Faktorio.cz razí minimalistickou vizi: jednoduché,
                    intuitivní a rychlé řešení pro vystavování faktur. Žádné
                    zbytečné funkce, které nikdy nepoužijete. Vystavte fakturu
                    kdykoliv a odkudkoliv, bez zadávání kreditní karty, během
                    několika vteřin po registraci.
                  </p>
                  <Link href="/manifest" className="block mt-4">
                    <Button
                      variant="link"
                      className="p-0 h-auto font-semibold text-primary hover:underline"
                    >
                      Přečtěte si náš manifest &rarr;
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex flex-row items-center gap-3 text-xl">
                    <LucidePiggyBank className="h-6 w-6 text-primary" />
                    <h2>Kolik to stojí?</h2>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground leading-relaxed space-y-4">
                  <p>
                    Provoz celé aplikace faktorio.cz na rok momentálně stojí
                    méně, než cena jednoho měsíčního předplatného konkurence.
                    <strong> Dokud to půjde, bude Faktorio.cz zdarma.</strong>
                  </p>
                  <p>
                    Pokud by se náklady na provoz razantně zvýšily, zvážím
                    přidání reklamy s možností jejího odstranění za symbolický
                    poplatek (např. 300 Kč ročně).
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg text-sm">
                    <p className="font-medium mb-2">
                      Chcete podpořit provoz?
                    </p>
                    <p>
                      Můžete zaslat libovolnou částku na můj{' '}
                      <a
                        className="text-primary font-semibold hover:underline"
                        href="https://revolut.me/capaj"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Revolut účet
                      </a>{' '}
                      (do poznámky uveďte faktorio.cz).
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      LTC: LKpED8uFA2tj8da8JYNEGWCUNjorEbetrQ
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-xl">
                    Chcete se podílet na vývoji?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground leading-relaxed">
                    Faktorio je <strong>open-source</strong> projekt a uvítám
                    jakékoliv příspěvky do kódu. Pokud by projekt někdy
                    generoval zisk, bude rozdělen mezi všechny přispěvatele
                    podle velikosti jejich příspěvku (více info v projektu{' '}
                    <a
                      href="https://github.com/capaj/contrib-locs"
                      className="text-primary hover:underline"
                    >
                      contrib-locs
                    </a>
                    ).
                  </p>

                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <a
                      href="https://github.com/capaj/faktorio"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="outline" className="gap-2">
                        <LucideGithub className="h-4 w-4" />
                        GitHub repozitář
                      </Button>
                    </a>
                    <a
                      href="https://twitter.com/capajj"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="outline" className="gap-2">
                        <LucideTwitter className="h-4 w-4 text-blue-400" />
                        @capajj
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 bg-muted/30">
          <div className="container px-2 md:px-6">
            <FeatureComparison />
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
