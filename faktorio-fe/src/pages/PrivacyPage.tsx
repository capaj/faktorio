import { PageShell } from './PageShell'

export const PrivacyPage = () => {
  return (
    <PageShell>
      <div className="flex flex-col gap-6 w-full  dark:prose-invert dark">
        <h1>Zásady ochrany osobních údajů pro Aplikaci na Fakturování</h1>
        <p>Poslední aktualizace: 2026-04-15</p>
        <p>
          Vážíme si Vašeho soukromí a zavazujeme se chránit Vaše osobní údaje.
          Tento dokument, "Zásady ochrany osobních údajů", vysvětluje, jaké
          informace shromažďujeme, jak je používáme, jak je chráníme a jaké
          máte možnosti ohledně svých údajů při používání naší aplikace na
          fakturování Faktorio ("Aplikace"). Zpracování osobních údajů probíhá
          v souladu s Nařízením Evropského parlamentu a Rady (EU) 2016/679
          (GDPR) a zákonem č. 110/2019 Sb., o zpracování osobních údajů.
        </p>

        <h2>1. Správce osobních údajů</h2>
        <p>
          Správcem Vašich osobních údajů je provozovatel Aplikace Faktorio.
          V případě jakýchkoli dotazů týkajících se zpracování osobních údajů
          nás můžete kontaktovat na e-mailu:{' '}
          <a href="mailto:capajj@gmail.com">capajj@gmail.com</a>.
        </p>

        <h2>2. Jaké informace shromažďujeme</h2>
        <h3>Informace, které poskytnete</h3>
        <ul className="ml-6">
          <li>
            <strong>Kontaktní a registrační údaje</strong>: Při vytvoření účtu
            od Vás požadujeme e-mailovou adresu, jméno a údaje o Vaší
            společnosti (název, IČO, DIČ, sídlo).
          </li>
          <li>
            <strong>Fakturační informace</strong>: Při vytváření faktur
            zadáváte údaje o svých zákaznících (názvy, adresy, IČO, DIČ,
            bankovní spojení) a podrobnosti o fakturovaných položkách.
          </li>
          <li>
            <strong>Obsah nahraných souborů</strong>: Pokud do Aplikace
            nahrajete dokumenty (např. přijaté faktury k extrakci údajů),
            zpracováváme jejich obsah za účelem poskytnutí služby.
          </li>
        </ul>
        <h3>Informace, které automaticky shromažďujeme</h3>
        <ul className="ml-6">
          <li>
            <strong>Protokolové soubory</strong>: Při používání Aplikace
            shromažďujeme technické informace, které Vaše zařízení odesílá,
            jako jsou IP adresa, typ prohlížeče, operační systém,
            poskytovatel internetových služeb a časové razítko.
          </li>
          <li>
            <strong>Cookies a obdobné technologie</strong>: Používáme pouze
            nezbytné technické cookies potřebné pro provoz Aplikace (např.
            přihlášení a udržení relace). Nepoužíváme reklamní ani
            sledovací cookies třetích stran.
          </li>
        </ul>

        <h2>3. Právní základ zpracování</h2>
        <p>Vaše osobní údaje zpracováváme na základě těchto právních titulů:</p>
        <ul className="ml-6">
          <li>
            <strong>Plnění smlouvy</strong> (čl. 6 odst. 1 písm. b GDPR) –
            poskytování služeb Aplikace na základě uzavřených podmínek
            používání.
          </li>
          <li>
            <strong>Plnění právních povinností</strong> (čl. 6 odst. 1 písm. c
            GDPR) – zejména v oblasti účetnictví a daní.
          </li>
          <li>
            <strong>Oprávněný zájem</strong> (čl. 6 odst. 1 písm. f GDPR) –
            zajištění bezpečnosti Aplikace a prevence podvodů.
          </li>
          <li>
            <strong>Souhlas</strong> (čl. 6 odst. 1 písm. a GDPR) – pokud Vám
            zasíláme nepovinná obchodní sdělení.
          </li>
        </ul>

        <h2>4. Jak používáme Vaše informace</h2>
        <p>Vaše osobní údaje používáme k:</p>
        <ul className="ml-6">
          <li>Poskytování, provozu a zlepšování našich služeb.</li>
          <li>Komunikaci s Vámi o Vašem účtu nebo transakcích.</li>
          <li>
            Odesílání informací, které mohou být pro Vás užitečné, včetně
            nabídek a aktualizací (pouze s Vaším souhlasem).
          </li>
          <li>Zajištění bezpečnosti Aplikace a prevence podvodů.</li>
          <li>Plnění zákonných povinností.</li>
        </ul>

        <h2>5. Kde Vaše údaje ukládáme (umístění serverů)</h2>
        <p>
          <strong>
            Veškeré Vaše osobní údaje jsou ukládány výhradně v datových
            centrech umístěných na území Evropské unie.
          </strong>{' '}
          Tím je zajištěno, že zpracování probíhá plně v souladu s GDPR a že
          Vaše údaje nejsou přenášeny do třetích zemí, které neposkytují
          odpovídající úroveň ochrany osobních údajů. Pokud by v budoucnu
          bylo nutné využít zpracovatele mimo EU, stane se tak pouze za
          podmínek stanovených GDPR (standardní smluvní doložky nebo jiné
          vhodné záruky) a o takové změně Vás budeme informovat.
        </p>

        <h2>6. Sdílení Vašich informací</h2>
        <p>Vaše osobní údaje sdílíme pouze v těchto případech:</p>
        <ul className="ml-6">
          <li>S Vaším výslovným souhlasem.</li>
          <li>
            S poskytovateli služeb, kteří nám pomáhají poskytovat Aplikaci
            (např. hosting, technická podpora, e-mailové služby), vždy pod
            přísnými smluvními podmínkami o ochraně údajů a pouze v rozsahu
            nezbytném pro poskytnutí jejich služby. Tito zpracovatelé jsou
            vázáni povinností mlčenlivosti.
          </li>
          <li>Pokud to vyžaduje zákon nebo rozhodnutí orgánu veřejné moci.</li>
        </ul>
        <p>
          Vaše osobní údaje <strong>nikdy neprodáváme</strong> třetím stranám
          a nevyužíváme je pro reklamní účely třetích stran.
        </p>

        <h2>7. Doba uchování údajů</h2>
        <p>
          Osobní údaje uchováváme pouze po dobu nezbytně nutnou k účelům,
          pro které byly shromážděny:
        </p>
        <ul className="ml-6">
          <li>
            Po dobu trvání Vašeho účtu a poskytování služeb Aplikace.
          </li>
          <li>
            Po dobu vyžadovanou právními předpisy (zejména účetními a
            daňovými, typicky 10 let).
          </li>
          <li>
            Po zrušení účtu jsou údaje, které již nejsou potřeba pro plnění
            zákonných povinností, vymazány nebo anonymizovány.
          </li>
        </ul>

        <h2>8. Zabezpečení údajů</h2>
        <p>
          Přijímáme vhodná technická a organizační opatření k ochraně Vašich
          osobních údajů před neoprávněným přístupem, ztrátou, zničením nebo
          změnou. Veškerá komunikace s Aplikací probíhá zabezpečeně
          prostřednictvím protokolu HTTPS (TLS). Hesla jsou uložena v
          zahashované podobě.
        </p>

        <h2>9. Vaše práva</h2>
        <p>
          V souladu s GDPR máte ve vztahu ke svým osobním údajům následující
          práva:
        </p>
        <ul className="ml-6">
          <li>
            <strong>Právo na přístup</strong> – získat informaci o tom, zda a
            jaké Vaše údaje zpracováváme.
          </li>
          <li>
            <strong>Právo na opravu</strong> – požadovat opravu nepřesných
            nebo neúplných údajů.
          </li>
          <li>
            <strong>Právo na výmaz</strong> („právo být zapomenut") – pokud
            neexistuje zákonný důvod pro další zpracování.
          </li>
          <li>
            <strong>Právo na omezení zpracování</strong>.
          </li>
          <li>
            <strong>Právo na přenositelnost údajů</strong> – získat své údaje
            ve strukturovaném, běžně používaném a strojově čitelném formátu.
          </li>
          <li>
            <strong>Právo vznést námitku</strong> proti zpracování
            založenému na oprávněném zájmu.
          </li>
          <li>
            <strong>Právo odvolat souhlas</strong> – kdykoli, pokud je
            zpracování založeno na souhlasu.
          </li>
          <li>
            <strong>Právo podat stížnost</strong> u dozorového úřadu, kterým
            je v České republice Úřad pro ochranu osobních údajů (
            <a
              href="https://www.uoou.cz"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.uoou.cz
            </a>
            ).
          </li>
        </ul>
        <p>
          Svá práva můžete uplatnit kontaktováním nás na e-mailu uvedeném
          níže. Na Vaši žádost odpovíme bez zbytečného odkladu, nejpozději
          do jednoho měsíce.
        </p>

        <h2>10. Automatizované rozhodování</h2>
        <p>
          Při zpracování Vašich osobních údajů nedochází k automatizovanému
          rozhodování ani k profilování ve smyslu čl. 22 GDPR.
        </p>

        <h2>11. Změny těchto zásad</h2>
        <p>
          Tyto zásady můžeme čas od času aktualizovat, aby odrážely změny v
          našich službách nebo v právních předpisech. O významných změnách
          Vás budeme informovat prostřednictvím Aplikace nebo e-mailem.
          Aktuální verze je vždy dostupná na této stránce s uvedením data
          poslední aktualizace.
        </p>

        <h2>12. Kontaktujte nás</h2>
        <p>
          Pokud máte jakékoli dotazy, připomínky nebo obavy ohledně ochrany
          Vašich osobních údajů, nebo chcete uplatnit některé ze svých práv,
          kontaktujte nás na:{' '}
          <a href="mailto:capajj@gmail.com">capajj@gmail.com</a>
        </p>
        <hr />
      </div>
    </PageShell>
  )
}
