## How to run from scratch for local development

### Prerequisites

- Node.js 22+
- pnpm
- Optionally
  - turso DB on your turso cloud account
  - google client ID for google login
  - mailjet API key for sending emails

You need to have turso DB setup. You only need google client ID for google login.
Mailjet you only need if you want to send emails.

1. `pnpm i`
2. `cd faktorio-fe && cp .env.example .env`
3. `cd faktorio-api && cp .dev.vars.example .dev.vars`
4. fill in missing env vars in both files, keep empty those you don't want to use(mailjet, google client ID)
5. run migrations
6. `pnpm dev`

## How to run migrations

1. `cd faktorio-db`
2. `pnpm migrate`

## How to generate new migrations

1. `cd faktorio-db`
2. `pnpm generate`

Migration do not run on CI. They must be run manually for now.
