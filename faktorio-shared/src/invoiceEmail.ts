export type InvoiceEmailLanguage = 'cs' | 'en'
export type InvoiceEmailKind = 'invoice' | 'reminder'

export function invoiceEmailLanguage(
  contactLanguage?: string | null,
  invoiceLanguage?: string
): InvoiceEmailLanguage {
  const language = contactLanguage || invoiceLanguage
  return language === 'en' ? 'en' : 'cs'
}

export function invoiceEmailTemplate(
  data: {
    number: string
    dueOn: string
    senderName: string
  },
  language: InvoiceEmailLanguage,
  kind: InvoiceEmailKind
) {
  const due = data.dueOn.split('-')
  const dueDate =
    language === 'cs'
      ? `${Number(due[2])}. ${Number(due[1])}. ${due[0]}`
      : data.dueOn
  if (language === 'en') {
    return {
      subject:
        kind === 'invoice'
          ? `Invoice ${data.number}`
          : `Payment reminder – invoice ${data.number}`,
      body:
        kind === 'invoice'
          ? `Hello,\n\nPlease find invoice ${data.number} at the link below. Payment is due on ${dueDate}.\n\nThank you.\n${data.senderName}`
          : `Hello,\n\nThis is a reminder that invoice ${data.number}, due on ${dueDate}, remains unpaid. Please arrange payment. If you have already paid, please disregard this reminder.\n\nThank you.\n${data.senderName}`
    }
  }
  return {
    subject:
      kind === 'invoice'
        ? `Faktura ${data.number}`
        : `Připomenutí platby – faktura ${data.number}`,
    body:
      kind === 'invoice'
        ? `Dobrý den,\n\nzasíláme Vám fakturu č. ${data.number}, kterou naleznete na odkazu níže. Datum splatnosti je ${dueDate}.\n\nDěkujeme.\n${data.senderName}`
        : `Dobrý den,\n\npřipomínáme neuhrazenou fakturu č. ${data.number} se splatností ${dueDate}. Prosíme o její úhradu. Pokud jste již zaplatili, považujte tuto zprávu za bezpředmětnou.\n\nDěkujeme.\n${data.senderName}`
  }
}
