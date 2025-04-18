---
title: Local-first fakturační platforma
date: 2024-12-20
---

# Local-first přístup ve Faktoriu

Jsme rádi, že můžeme představit novou funkcionalitu, která posouvá Faktorio na další úroveň - **režim local-first**. Tato inovace vám umožní používat Faktorio plně lokálně, přímo ve vašem prohlížeči, bez nutnosti připojení k internetu nebo vytváření účtu.

## Co znamená local-first?

Local-first software staví na myšlence, že vaše data by měla být primárně uložena na vašem zařízení, a ne v cloudu. Tento přístup přináší řadu výhod:

- **Soukromí** - vaše data zůstávají pouze na vašem zařízení
- **Nezávislost na internetu** - pracujte i bez připojení k síti
- **Rychlost** - žádné čekání na odpověď ze serveru
- **Vlastnictví dat** - plná kontrola nad vašimi daty
- **Žádné závislosti na externích službách** - aplikace funguje i bez naší infrastruktury

Zároveň ale klientům, kteří si to přejí, nadále nabízíme možnost cloudového účtu se všemi výhodami, které přináší (sdílení dat mezi zařízeními, týmová spolupráce, atd.).

## Jak to funguje ve Faktoriu?

Implementace local-first přístupu ve Faktoriu využívá několik moderních technologií:

### SQL.js - SQLite přímo v prohlížeči

Srdcem local-first řešení je [SQL.js](https://sql.js.org/), což je JavaScriptový port SQLite kompilovaný do WebAssembly. To nám umožňuje provozovat plnohodnotnou relační databázi přímo ve vašem prohlížeči. Databázové soubory jsou uloženy v Origin Private File System (OPFS), což je bezpečné úložiště moderních prohlížečů.

### Jeden kód pro cloud i lokální režim

Co je na implementaci opravdu geniální, je použití stejného kódu jak pro cloudové, tak pro lokální nasazení. Díky našemu návrhu:

- Používáme stejné databázové schéma (Drizzle ORM)
- Sdílíme stejné migrační skripty
- Využíváme identické datové modely
- API komunikace funguje stejným způsobem

Toto "napiš jednou, spusť kdekoli" je možné díky:

### tRPC - end-to-end typově bezpečné API

[tRPC](https://trpc.io/) nám umožňuje definovat API endpointy tak, že můžeme sdílet typy mezi frontendem a backendem. V local-first režimu jsou tyto procedury volány přímo na klientovi místo volání na server, ale rozhraní zůstává identické.

## Jak začít používat local-first režim?

Používání této funkce je jednoduché:

1. Přejděte na stránku "Lokální databáze"
2. Vytvořte novou databázi (např. "moje_faktury")
3. Vyplňte své údaje
4. Aktivujte databázi kliknutím na "Načíst"

Po aktivaci databáze se aplikace automaticky přepne do local-first režimu a můžete začít používat všechny funkce Faktoria (vytváření faktur, správa kontaktů, atd.) - vše lokálně ve vašem prohlížeči.

## Technické detaily

Pro technicky založené uživatele může být zajímavé, jak celý proces funguje:

- Databázové soubory SQLite jsou ukládány v Origin Private File System (OPFS)
- Při inicializaci nové databáze se automaticky aplikují všechny migrační skripty
- Uživatelská data jsou uložena v localStorage a v OPFS
- Pro přihlášení používáme lokální autentizační token
- Databáze je dostupná v kontextu celé aplikace díky React Context API

Díky WebAssembly dosahuje SQL.js výkonu, který je více než dostatečný pro použití ve Faktoriu. Faktorio v local-first režimu zvládne pohodlně pracovat se stovkami tisíc záznamů.

## Proč je to důležité?

Local-first software představuje budoucnost webových aplikací. Místo pouhého tenkého klienta pro cloudovou službu získáváte plnohodnotnou aplikaci s možností cloudové synchronizace.

Díky technologiím jako SQL.js, WebAssembly a moderním API prohlížečů můžeme dnes vytvářet webové aplikace, které před několika lety nebyly možné.

Pro firmy a jednotlivce to znamená větší kontrolu nad daty, nezávislost a dlouhodobou použitelnost software bez ohledu na změny v cloudových službách.

## Co dál?

V budoucnu plánujeme local-first režim dále rozvíjet:

- Možnost synchronizace dat do google drive
- Offline přístup s možností synchronizace po připojení k internetu

Věříme, že local-first přístup představuje významný krok vpřed v oblasti fakturačních platforem a jsme rádi, že můžeme tuto technologii přinést našim uživatelům.

![Local-first databáze ve Faktoriu](../../../images/cfdeaa7e66634251023815c5ddd3920444fb9cce31cb925474f03a417f79e206.png)
