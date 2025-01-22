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
2. `cp .env.example .env`
3. fill in missing env vars
4. `pnpm dev`

## Project status

There is already a free invoicing solution which does everything that faktorio does and much more here: https://www.fakturovac.cz/
Use that one if you need to invoice in Czech republic.
I might come back to develop faktorio bit more if I ever get bored in the future or when fakturovac shuts down.

## Common issues

make sure to use `pk_test` clerk key. Clerk won't even load when you use production key on localhost
