import { Button } from '@/components/ui/button'
import { Link } from 'wouter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucidePiggyBank, Users, FileText } from 'lucide-react'

import { MountainIcon } from '@/components/MountainIcon'
import { Footer } from './PageShell'
import { ButtonLink } from '@/components/ui/link'
import { Separator } from '@/components/ui/separator'
import { trpcClient } from '@/lib/trpcClient'
import { FeatureComparison } from '@/components/FeatureComparison'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { GithubIcon, XIcon } from './Icons'

// Responsive WebP versions of /faktura.png (1904×1935)
const invoicePreview = {
  src: '/images/landing/faktura-800.webp',
  srcSet: [480, 800, 1200, 1904]
    .map((width) => `/images/landing/faktura-${width}.webp ${width}w`)
    .join(', '),
  width: 1904,
  height: 1935
}

export const LandingPage = () => {
  const { data: systemStats } = trpcClient.systemStats.useQuery(undefined, {
    staleTime: 24 * 60 * 60 * 1000 // 24 hours
  })

  return (
    <>
      <div>
        <section className="w-full py-6 md:py-12 lg:py-16 xl:py-24">
          <div className="container flex flex-col items-center justify-center space-y-4 px-2 md:px-6 text-center">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 pb-2">
                Fakturace bez zbytečností.
              </h1>
              <p className="mx-auto max-w-[700px] text-fg-muted md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Moderní, rychlý a otevřený nástroj pro živnostníky a malé firmy.
                Vystavujte faktury zdarma, bezpečně a s radostí.
              </p>
            </div>

            <div className="mx-auto max-w-[400px] space-y-4 pt-4">
              <Button
                asChild
                className="w-full h-12 text-lg transition-all hover:scale-105 shadow-lg"
              >
                <Link href="/signup">Začít fakturovat zdarma</Link>
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-2">
                Registrace zabere méně než minutu. Žádné skryté poplatky.
              </p>
              <Separator className="my-4" />
              <p className="text-sm text-center text-fg-muted mt-2">
                Nechcete svoje data posílat na cloud? Je pro vás soukromí na
                prvním místě a rád si zálohujete data sám?
              </p>

              <ButtonLink
                href="/local-dbs"
                variant="secondary"
                className="text-sm font-medium"
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
                <button
                  type="button"
                  aria-label="Zvětšit náhled faktury"
                  className="relative block w-full text-left group lg:col-span-3 cursor-zoom-in"
                >
                  <span className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500"></span>
                  <img
                    alt="Náhled faktury"
                    className="relative block mx-auto rounded-xl object-contain w-full h-auto shadow-2xl border border-border/50"
                    src={invoicePreview.src}
                    srcSet={invoicePreview.srcSet}
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    width={invoicePreview.width}
                    height={invoicePreview.height}
                    // LCP element on mobile; React 18 only passes the lowercase attribute through
                    {...{ fetchpriority: 'high' }}
                  />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 border-none bg-transparent shadow-none block overflow-auto outline-none [&>button]:hidden">
                <img
                  alt="Náhled faktury"
                  className="max-w-none min-w-[150vw] md:min-w-0 md:max-w-full md:max-h-[95vh] rounded-lg shadow-2xl mx-auto"
                  src="/images/landing/faktura-1904.webp"
                  width={invoicePreview.width}
                  height={invoicePreview.height}
                />
              </DialogContent>
            </Dialog>
            <div className="flex flex-col gap-6 lg:col-span-2">
              {/* Always rendered (with placeholders while loading) so the prerendered layout does not shift */}
              <Card className="overflow-hidden border-none shadow-lg bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                      <Users className="h-8 w-8 text-blue-500 mb-2" />
                      <div className="text-center">
                        <div className="text-3xl font-bold tracking-tight">
                          {systemStats
                            ? `${Math.ceil(systemStats.user_count / 10) * 10}+`
                            : '…'}
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
                          {systemStats
                            ? `${Math.ceil(systemStats.invoice_count / 10) * 10}+`
                            : '…'}
                        </div>
                        <div className="text-sm text-muted-foreground font-medium">
                          vystavených faktur
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow duration-300">
                <CardHeader>
                  <CardTitle
                    as="h2"
                    className="flex flex-row items-center gap-3 text-3xl font-bold"
                  >
                    <MountainIcon
                      className="h-6 w-6 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    Vše co potřebujete, nic navíc
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
                  <Link
                    href="/manifest"
                    className="mt-4 inline-flex min-h-6 items-center font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Přečtěte si náš manifest &rarr;
                  </Link>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow duration-300">
                <CardHeader>
                  <CardTitle
                    as="h2"
                    className="flex flex-row items-center gap-3 text-3xl font-bold"
                  >
                    <LucidePiggyBank
                      className="h-6 w-6 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    Kolik to stojí?
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
                  <CardTitle as="h2" className="text-xl">
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
                      className="text-primary underline underline-offset-2"
                    >
                      contrib-locs
                    </a>
                    ).
                  </p>

                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <Button asChild variant="outline" className="gap-2">
                      <a
                        href="https://github.com/capaj/faktorio"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <GithubIcon className="h-4 w-4" aria-hidden="true" />
                        GitHub repozitář
                        <span className="sr-only">(otevře se v novém okně)</span>
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="gap-2">
                      <a
                        href="https://x.com/capajj"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <XIcon className="h-4 w-4" aria-hidden="true" />
                        @capajj
                        <span className="sr-only">
                          na X (otevře se v novém okně)
                        </span>
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 bg-muted/30 [content-visibility:auto] [contain-intrinsic-size:auto_1000px]">
          <div className="container px-2 md:px-6">
            <FeatureComparison />
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
