import { PageShell } from './PageShell'

export const PrivacyPage = () => {
  return (
    <PageShell>
      <div className="flex flex-col gap-6 w-full  dark:prose-invert dark">
        <h1>Zásady ochrany osobních údajů pro Aplikaci na Fakturování</h1>
        <p>Poslední aktualizace: 2024-04-04</p>
        <p>
          Vážíme si Vašeho soukromí a zavazujeme se chránit Vaše osobní údaje.
          Tento dokument, "Zásady ochrany osobních údajů", vysvětluje, jaké
          informace shromažďujeme, jak je používáme a jaké máte možnosti ohledně
          svých údajů při používání naší aplikace na fakturování ("Aplikace").
        </p>
        <h2>1. Jaké informace shromažďujeme</h2>
        <h3>Informace, které poskytnete</h3>
        <ul className="ml-6">
          <li>
            <strong>Kontaktní údaje</strong>: Když vytvoříte účet, požádáme Vás
            o poskytnutí e-mailové adresy a jména Vaší společnosti.
          </li>
          <li>
            <strong>Fakturační informace</strong>: Při vytváření faktur můžete
            zadávat údaje jako jsou názvy zákazníků, jejich adresa a další
            podrobnosti související s fakturací.
          </li>
        </ul>
        <h3>Informace, které automaticky shromažďujeme</h3>
        <ul>
          <li>
            <strong>Protokolové soubory</strong>: Při používání Aplikace
            shromažďujeme informace, které Váš zařízení odesílá, jako jsou IP
            adresa, typ prohlížeče, poskytovatel internetových služeb a časové
            razítko.
          </li>
        </ul>
        <h2>2. Jak používáme Vaše informace</h2>
        <p>Vaše osobní údaje používáme k:</p>
        <ul className="ml-6">
          <li>Poskytování a zlepšování našich služeb.</li>
          <li>Komunikaci s Vámi o Vašem účtu nebo transakcích.</li>
          <li>
            Odesílání informací, které mohou být pro Vás užitečné, včetně
            nabídek a aktualizací.
          </li>
          <li>Zajištění bezpečnosti a prevence podvodů.</li>
        </ul>
        <h2>3. Sdílení Vašich informací</h2>
        <p>Vaše osobní údaje sdílíme pouze v těchto případech:</p>
        <ul className="ml-6">
          <li>S Vaším výslovným souhlasem.</li>
          <li>
            S poskytovateli služeb, kteří nám pomáhají poskytovat Aplikaci
            (např. hosting, technická podpora), vždy pod přísnými smluvními
            podmínkami o ochraně údajů.
          </li>
          <li>Pokud to vyžaduje zákon nebo soudní rozhodnutí.</li>
        </ul>
        <h2>4. Vaše práva</h2>
        <p>
          Máte právo na přístup, opravu nebo vymazání Vašich osobních údajů,
          které máme. Můžete také nesouhlasit s určitými způsoby používání
          Vašich informací.
        </p>
        <h2>5. Změny těchto zásad</h2>
        <p>
          Můžeme tyto zásady aktualizovat. O jakýchkoli změnách Vás budeme
          informovat prostřednictvím Aplikace nebo e-mailem.
        </p>
        <h2>Kontaktujte nás</h2>
        <p>
          Pokud máte jakékoli dotazy nebo obavy ohledně ochrany Vašich osobních
          údajů, prosím, kontaktujte nás na:{' '}
          <a href="mailto:capajj@gmail.com">capajj@gmail.com</a>
        </p>
        <hr />
      </div>
    </PageShell>
  )
}
