# Faktorio.cz

Monorepo containing BE and FE for faktorio.cz app.
Not a serious project, just did it for fun and to try using shadcn/tailwind on real world project.

Tech stack is:

- Typescript
- React.js
- Drizzle ORM
- TRPC
- Turso
- Shadcn
- Cloudflare workers

## How to run from scratch for local development

1. `pnpm i`
2. `cd faktorio-fe && cp .env.example .env`
3. `cd faktorio-api && cp .dev.vars.example .dev.vars`
4. fill in missing env vars in both files
5. `pnpm dev`

## How to generate new migrations

1. `cd faktorio-api`
2. `pnpm generate`

## How to run migrations

1. `cd faktorio-api`
2. `pnpm migrate`

Migration do not run on CI. They must be run manually for now.

## Project status

Project is under active development. The aim is to make this a number one invoicing app in Czech republic for freelancers and small companies.

## Common issues

make sure to use `pk_test` clerk key. Clerk won't even load when you use production key on localhost

## Planned features

- add ability to export XMLs for DPH and Kontrolni hlaseni, support monthly and quarterly cadence
- add feature to import expense invoices by OCRing them with google gemini 2.0
- add support for foreign currencies
- local-first and offline-first
- DPH priznani at the end of the year
- import from fakturoid
- automated DPH and Kontrolni hlaseni submission to ADIS every month/quarter for you with automated pupeteer script

## Features

- generate invoice PDF
- search through invoices
- contact management(integrated with ARES)
- support for foreign currencies ![nová faktura](images/cdc8dd7ed308322d42c6d5af6b481be7f7dff3cca6de0dcb16921f0e6f44ccbb.png)
- export invoices to Excel, CSV

## Free Alternatives

### https://www.fakturovac.cz/

- has most features same as faktorio, but it does not have any other currencies than CZK, so you cannot invoice in EUR for example

## Paid Alternatives
