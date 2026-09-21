## How to run from scratch for local development

### Prerequisites

- Node.js 22+
- pnpm
- Optionally
  - turso DB on your turso cloud account
  - google client ID for google login

You need to have turso DB setup. You only need google client ID for google login.
Emails use the Cloudflare `SEND_EMAIL` Worker binding. `wrangler dev` simulates delivery locally, logging messages and saving their content for inspection; no email API keys are needed. Browser-only local mode does not send emails.

1. `pnpm i`
2. `cd faktorio-fe && cp .env.example .env`
3. `cd faktorio-api && cp .dev.vars.example .dev.vars`
4. fill in missing env vars in both files, keep the Google client ID empty if you don't want Google login
5. run migrations
6. `pnpm dev`

## UI documentation

See [app screenshots](docs/screenshots/README.md) for examples of the current interface, starting with invoice and reminder emails. Run `pnpm docs:screenshots` to refresh these captures with sample data. When documenting another screen, add its screenshot and reproduction instructions there.

## Database

use turso cloud for database to develop locally. You can also use local sqlite database, but it's not recommended as some features are not supported for local database.

## How to run migrations

1. `cd faktorio-db`
2. `pnpm migrate`

## How to generate new migrations

1. `cd faktorio-db`
2. `pnpm generate`

Migration do not run on CI. They must be run manually for now.

## DB branching

This assumes your default db is named `faktorio-prod`.

## How to branch Turso database

1. `cd faktorio-api`
2. `pnpm switch-to-prod-turso-db`
