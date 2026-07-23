---
title: Faktury mimo EU nově správně v XML přiznání k DPH
date: 2026-07-23
---

Faktorio nově zahrnuje faktury za služby poskytnuté firemním zákazníkům mimo Evropskou unii do XML přiznání k DPH. Typickým příkladem je český programátor, který fakturuje vývoj softwaru společnosti se sídlem v USA.

Taková faktura se za běžných B2B podmínek nevykazuje jako tuzemské plnění s českou DPH. Její hodnota v korunách ale patří do přiznání k DPH, konkrétně na **řádek 26 – Ostatní uskutečněná plnění s nárokem na odpočet daně**.

## Proč je místo plnění mimo Českou republiku

Základní pravidlo stanoví § 9 odst. 1 zákona č. 235/2004 Sb., o dani z přidané hodnoty. U služby poskytnuté osobě povinné k dani je rozhodující sídlo příjemce. Zákon to formuluje stručně:

> „…je místo, kde má tato osoba sídlo.“

Aktuální znění je dostupné v oficiální [e-Sbírce – zákon č. 235/2004 Sb.](https://e-sbirka.gov.cz/sb/2004/235).

Pokud tedy český dodavatel poskytne běžnou programátorskou nebo konzultační službu firmě se sídlem v USA, místo plnění je zpravidla v USA. Na faktuře se proto nepřipočítává česká DPH.

Zákon zároveň v § 24a určuje, kdy se takové plnění přiznává. V textu používá formulaci:

> „…vzniká povinnost přiznat plnění ke dni uskutečnění tohoto plnění.“

Pro zařazení do období je tedy podstatné datum uskutečnění plnění, nikoli například pozdější datum zaplacení faktury.

## Proč právě řádek 26

Samotné přiřazení do řádku přiznání upřesňují oficiální pokyny a XML struktura EPO. U položky `pln_ost`, která odpovídá řádku 26, Finanční správa výslovně uvádí:

> „Poskytnutí služby s místem plnění mimo tuzemsko (§ 24a), mimo plnění vykazovaných na ř. 21 a ř. 24.“

Podrobnosti jsou uvedeny v aktuálním [popisu struktury DPHDP3 na Daňovém portálu](https://adisspr.mfcr.cz/dpr/adis/idpr_pub/epo2_info/popis_struktury_detail.faces?zkratka=DPHDP3).

Rozlišení řádků je důležité:

- služby firemnímu zákazníkovi v jiném členském státě EU se za splnění příslušných podmínek vykazují na řádku 21,
- běžné B2B služby zákazníkovi ve třetí zemi, například v USA, se vykazují na řádku 26,
- tuzemská plnění se základní sazbou DPH se vykazují standardně na řádku 1.

## Praktický příklad

Český plátce DPH vystavil ve druhém čtvrtletí roku 2026 americké společnosti tři faktury za programátorské služby:

| Datum uskutečnění plnění | Částka | Hodnota v Kč |
| --- | ---: | ---: |
| 30. 4. 2026 | 1 000 USD | 20 690 Kč |
| 31. 5. 2026 | 1 000 USD | 20 850 Kč |
| 30. 6. 2026 | 1 000 USD | 21 250 Kč |
| **Celkem** | **3 000 USD** | **62 790 Kč** |

Do řádku 26 přiznání k DPH vstoupí celková korunová hodnota **62 790 Kč**. Česká DPH se k těmto fakturám nepřipočte.

Pokud ve stejném období vznikla také tuzemská faktura se základem 7 300 Kč a 21% DPH, zůstane odděleně na řádku 1 se základem 7 300 Kč a daní 1 533 Kč.

## Co se objeví v XML

Faktorio nyní americké faktury rozpozná podle země odběratele, sečte jejich korunové hodnoty a do XML přiznání DPHDP3 zapíše:

```xml
<Veta2 pln_ost="62790" />
```

Faktury se zároveň zobrazí na stránce **Export XML pro finanční úřad** v samostatné části **Faktury vystavené mimo EU**. Díky tomu lze před stažením XML snadno zkontrolovat, které doklady byly do řádku 26 zahrnuty.

## Kontrolní a souhrnné hlášení

Tyto faktury se nevykazují v kontrolním hlášení. Finanční správa váže vykazování uskutečněných plnění v kontrolním hlášení na tuzemská plnění z řádků 1, 2 nebo 25; řádek 26 v tomto výčtu není. Viz oficiální přehled [Kdo podává kontrolní hlášení](https://financnisprava.gov.cz/cs/dane/dane/dan-z-pridane-hodnoty/kontrolni-hlaseni-DPH/kdo-podava-kontrolni-hlaseni).

Americká fakturace nepatří ani do souhrnného hlášení. To se u služeb týká relevantních plnění do jiných členských států EU, nikoli služeb poskytnutých zákazníkům ve třetích zemích.

## Na co si dát pozor

Popsaný postup platí pro běžnou B2B službu, například programování nebo konzultace, poskytnutou podnikateli mimo EU. Zákon obsahuje zvláštní pravidla například pro služby vztahující se k nemovitostem, vstup na akce nebo případy skutečného užití či spotřeby v tuzemsku. Důležité je také správně určit, že zákazník jedná jako osoba povinná k dani.

Ve Faktoriu proto zkontrolujte zejména:

1. zemi odběratele,
2. že faktura neobsahuje českou DPH,
3. datum uskutečnění plnění,
4. použitý kurz a výslednou korunovou hodnotu.

Vygenerované XML doporučujeme před podáním vždy zkontrolovat v aplikaci EPO nebo MOJE daně. Tento článek popisuje obecný případ a nenahrazuje individuální daňové poradenství.
