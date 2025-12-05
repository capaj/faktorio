# Faktorio.cz

Monorepo containing BE and FE for faktorio.cz app. A free open source app for invoicing targeted at self-employed OSVČ or tiny companies.

![nová faktura](faktorio-fe/public/images/cdc8dd7ed308322d42c6d5af6b481be7f7dff3cca6de0dcb16921f0e6f44ccbb.png)

## Features

- generate invoice PDF

## Shared invoices

Public URL format: https://faktorio.cz/shared-invoice/:invoiceShareId

Backend stores share records and tracks events (view, download, copy) including IP, UA, and country when available.

Frontend env:

- VITE_PUBLIC_API_URL points to the public API worker (defaults to production when missing).
- extract entire invoice from any JPG/PNG/BMP or PDF
- search through invoices
- contact management(integrated with [ARES](https://ares.gov.cz/))
- support for foreign currencies
- export invoices to Excel, CSV, ISDOC
- export invoices to XML for Czech tax authorities

## Feature Comparison

| Feature                                                   | Faktorio.cz | Fakturovac.cz | Fakturoid.cz | iDoklad.cz |
| --------------------------------------------------------- | :---------: | :-----------: | :----------: | :--------: |
| Generate invoice PDF                                      |     ✅      |      ✅       |      ✅      |     ✅     |
| Extract invoice from a raster image                       |     ✅      |      ❌       |      ❌      |     ❌     |
| Search through invoices                                   |     ✅      |      ✅       |      ✅      |     ✅     |
| Contact management (integrated with ARES)                 |     ✅      |      ✅       |      ✅      |     ✅     |
| Support for foreign currencies                            |     ✅      |      ❌       |      ✅      |     ✅     |
| Export invoices to Excel, CSV, ISDOC                      |     ✅      |      ✅       |      ✅      |     ✅     |
| Export invoices to XML for tax authorities                |     ✅      |      ✅       |      ✅      |     ✅     |
| Send invoices to an email from the app                    |     ❌      |      ✅       |      ✅      |     ✅     |
| API for integrations                                      |     ✅      |      ❌       |      ✅      |     ✅     |
| Push notifications in web app                             |     ✅      |      ❌       |      ❌      |     ❌     |
| Mobile app                                                |     ❌      |      ❌       |      ✅      |     ✅     |
| English UI                                                |     ❌      |      ❌       |      ✅      |     ✅     |
| Render invoices in english                                |     ✅      |      ❌       |      ✅      |     ✅     |
| Support reverse charge invoices(both domestic and abroad) |     ✅      |      ❌       |      ✅      |     ✅     |
| Share invoice publicly through a public link              |     ✅      |      ❌       |      ✅      |     ✅     |
| Multiple bank accounts                                    |     ✅      |      ✅       |      ✅      |     ✅     |
| Run locally without sending data to the cloud             |     ✅      |      ❌       |      ❌      |     ❌     |

_Note: Feature information for Fakturoid.cz and iDoklad.cz is based on common commercial offerings and may require verification._

## Project status

Project is under active development. The aim is to keep this a number one open source invoicing app in Czech republic for freelancers and small companies.

## Planned features

are all listed in [roadmap.md](roadmap.md)

## Tech stack

- Typescript
- Shadcn components
- React.js
- TRPC api
- Drizzle ORM
- Turso(sqlite)
- Cloudflare workers
- Google gemini for AI

## Self-hosting

You will need accounts/keys for these services before deploying your own instance:

- [Cloudflare Workers](https://developers.cloudflare.com/workers/) for `faktorio-api` (tRPC backend, cron) and `faktorio-public-api` (public/shared invoice endpoints)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/) (or another static host) for the `faktorio-fe` Vite build
- [Turso / libSQL](https://turso.tech/) for the primary database
- [Google Gemini API](https://ai.google.dev/gemini-api/docs/get-started) for invoice extraction and AI features
- [Mailjet](https://www.mailjet.com/) for transactional emails (password reset, notifications)
- [Google Cloud OAuth Client](https://console.cloud.google.com/apis/credentials) to obtain `VITE_GOOGLE_CLIENT_ID` for Google sign-in
- Web Push VAPID keys (generate locally with `pnpm --filter faktorio-api tsx scripts/generate-vapid-keys.ts`; no external service required)

Environment configuration:

- API Worker (`faktorio-api`): `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, `GEMINI_API_KEY`, `MAILJET_API_KEY`, `MAILJET_API_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- Public API Worker (`faktorio-public-api`): `TURSO_DATABASE_URL` and optionally `TURSO_AUTH_TOKEN` for Turso access
- Frontend (`faktorio-fe`): `VITE_API_URL` (points to `faktorio-api` `/trpc`), `VITE_PUBLIC_API_URL` (points to `faktorio-public-api`), `VITE_GOOGLE_CLIENT_ID`, `VITE_VAPID_PUBLIC_KEY`
