# Roadmap

## TODO

- add multiple invoicing details for one account
  - filter by them in the invoice list
- DPH priznani at the end of the year
- automated DPH and Kontrolni hlaseni submission to ADIS every month/quarter for you with automated puppeteer script
- integrate with Fio bank API to be able to mark invoices as paid when you receive money
- track changes to invoices on every edit in the UI
- onboarding with recurring invoices question
- allow to send invoice as email
- be able to share invoice link
- be able to export as excel
- ability to create an organization and add users to it. Users can see all the invoices for the organization.
  - ask questions like:
    - how much do I owe on income tax this year?
    - how many invoices have I issued this year?
    - how much income tax do I have to pay at the end of the quarter?
    - how many invoices have I issued in 2024?

## Done

- add ability to export XMLs for DPH and Kontrolni hlaseni, support monthly and quarterly cadence
- allow to add expense invoices by drag and drop PDF file(parse PDF with google gemini)
- be able to export as CSV/excel
- enable editing of invoices
- add TSC check on github CI
- migrate from clerk
- local-first mode
- mark invoices as paid
- add english invoice rendering
- integration with gemini
- add ISDOC format export
- add public API with complete CRUD for invoices
- ability to import contact and invoice data from fakturoid
