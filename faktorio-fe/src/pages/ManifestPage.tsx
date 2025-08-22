import { PageShell } from './PageShell'

export const ManifestPage = () => {
  return (
    <>
      <PageShell>
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
          Manifest
        </h1>
        <div className='flex justify-center w-full'>
          <img
            src="/images/20250610_1649_Robot Tax Preparation_simple_compose_01jxd4zrkafbvtmnk43fr8armx.png"
            alt="robot in a factory doing taxes with a keen eye"
            className="max-h-96"
          />
        </div>
        <p className="mt-3">
          Jako živnostník stojící na prahu podnikání jsem čelil jednoduchému,
          přesto však zdánlivě neřešitelnému dilematu: potřeba vystavovat jednu
          fakturu měsíčně bez zbytečných komplikací a vysokých nákladů. Tento
          zdánlivě malý požadavek se po 15 letech stal mým každodenním bojem. Na
          trhu jsem sice našel řadu řešení, ale všechna přicházela s
          nepřiměřenými cenami nebo složitostmi, které přesahovaly mé skromné
          požadavky. Platit 175 Kč měsíčně za vystavení jedné jediné faktury se
          mi zdálo zbytečné. Co kdyby existovalo řešení, které by bylo speciálně
          navržené pro malé podnikatele jako jsem já? Řešení, které by bylo
          jednoduché, cenově dostupné všem s mobilem/tabletem?
        </p>
        <p className="mt-3">
          Daňové přiznání mě vždycky iritovalo. Musím se přiznat státu se všemi
          svými příjmy, výdaji-budiž stát musí také z něčeho žít. Když udělám
          chybu je zde nebezpečně vysoká šance, že mi hrozí pokuta v nejhorším
          případě i vězení. Pokud vše vyplním správně dostanu nějaký pozitivní
          feedback? Ale kdeže. Stát nedokáže ani říct "Děkuji, zvládli jste to
          správně!" Když pak odešlete peníze na účet vaší krajské finanční
          správy, tak máte stejný pocit, jako by jste ty peníze hodili do
          kanálu.
        </p>
        <p>
          Stát zároveň daňovou legislativu neustále mění, takže musím být
          neustále ve střehu, abych neudělal chybu. Stát by měl být
          partnerem podnikatele. Dát mu zdarma moderní a přívětivé nástroje pro
          vedení účetnictví a daňové evidence. Bohužel tady selhává stát na plné
          čáře. Formuláře pro daňové přiznání jsou extrémě složité a
          neintuitivní. Jsou to v podstatě jen elektronické verze papírových
          formulářů.
        </p>
        <p className="mt-3">
          V ideálním světě by měl malý podnikatel jen vystavit faktury a celý
          zbytek daňové administrativy by měl být vyřešen automaticky. Toto je
          hlavním cílem faktorio.cz. Úplně automatizovat 99% daňové evidence.
          Jako programátor si myslím, že máme šanci tento problém vyřešit. Už
          jsem tomu pár hodin svého času obětoval a když vidím jak se to daří,
          tak mě to motivuje k tomu pokračovat.
        </p>
        <h4 className='mt-6'>Jak můžete pomoci?</h4>
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
      </PageShell>
    </>
  )
}
