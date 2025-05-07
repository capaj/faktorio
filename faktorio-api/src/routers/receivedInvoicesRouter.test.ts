const shouldPassSchema = {
  invoice_number: '22003610',
  variable_symbol: '22003610',
  date_of_issue: '2020-05-05',
  date_of_taxable_supply: '2020-05-05',
  date_of_maturity: '2020-05-12',
  payment_method: 'cod',
  supplier: {
    name: 'TRIDO, s.r.o.',
    address: 'Na Brankách 3\n678 01 Blansko\nCzech Republic',
    ico: '65278151',
    dic: 'CZ65278151',
    bank_account: '106303771/0300',
    bank_name: 'ČS obchodní banka - Blansko'
  },
  customer: {
    name: 'Špác Jiří',
    address: 'Královopolské Vážany 245\n683 01 Rousínov\nCzech Republic',
    ico: null,
    dic: null
  },
  items: [
    {
      description: 'Dálkový ovladač PEARL Twin - 2-kanálový (č.S10019-00007)',
      quantity: 1,
      unit: 'ks',
      price_per_unit: 500,
      vat_rate: 21,
      net_price: 500,
      vat_amount: 105,
      gross_price: 605
    },
    {
      description: 'NEZB POŠTOVNÉ\n602500 Poštovné /dopravné /balné',
      quantity: 1,
      unit: null,
      price_per_unit: 120,
      vat_rate: 21,
      net_price: 120,
      vat_amount: 25.2,
      gross_price: 145.2
    }
  ],
  total_net: 620,
  total_vat: 130.2,
  total_gross: 750.2,
  currency: 'CZK',
  rounding: -0.2,
  amount_due: 750
}
