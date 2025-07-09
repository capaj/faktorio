# Faktorio.cz

Monorepo containing BE and FE for faktorio.cz app. A free open source app for invoicing targeted at self-employed OSVČ or tiny companies.

## Features

- generate invoice PDF
- extract entire invoice from any JPG/PNG/BMP or PDF
- search through invoices
- contact management(integrated with ARES)
- support for foreign currencies ![nová faktura](images/cdc8dd7ed308322d42c6d5af6b481be7f7dff3cca6de0dcb16921f0e6f44ccbb.png)
- export invoices to Excel, CSV
- export invoices to XML for Czech tax authorities

## Feature Comparison

| Feature                                    | Faktorio.cz | Fakturovac.cz | Fakturoid.cz | iDoklad.cz |
| ------------------------------------------ | :---------: | :-----------: | :----------: | :--------: |
| Generate invoice PDF                       |     ✅      |      ✅       |      ✅      |     ✅     |
| Extract invoice from a raster image        |     ✅      |      ❌       |      ❌      |     ❌     |
| Search through invoices                    |     ✅      |      ✅       |      ✅      |     ✅     |
| Contact management (integrated with ARES)  |     ✅      |      ✅       |      ✅      |     ✅     |
| Support for foreign currencies             |     ✅      |      ❌       |      ✅      |     ✅     |
| Export invoices to Excel, CSV              |     ✅      |      ✅       |      ✅      |     ✅     |
| Export invoices to XML for tax authorities |     ✅      |      ✅       |      ✅      |     ✅     |
| Send invoices to an email from the app     |     ❌      |      ✅       |      ✅      |     ✅     |
| API for integrations                       |     ❌      |      ❌       |      ✅      |     ✅     |
| Push notifications in web app              |     ✅      |      ❌       |      ❌      |     ❌     |
| Mobile app                                 |     ❌      |      ❌       |      ✅      |     ✅     |
| English UI                                 |     ❌      |      ❌       |      ✅      |     ✅     |

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
