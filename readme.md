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

There is already a free invoicing solution which does everything that faktorio does and much more here: https://www.fakturovac.cz/
Use that one if you need to invoice in Czech republic.
I might come back to develop faktorio bit more if I ever get bored in the future or when fakturovac shuts down or turns into paid only

## Common issues

make sure to use `pk_test` clerk key. Clerk won't even load when you use production key on localhost

## TODO

- add ability to export XMLs for DPH and Kontrolni hlaseni, support monthly and quarterly cadence
- add feature to import expense invoices by OCRing them with google gemini 2.0
- add support for foreign currencies
