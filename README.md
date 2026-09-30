# BorrowBox

Peer-to-peer campus borrowing app using Express, MySQL and a plain HTML/CSS/JS frontend.

## Setup
1. Copy `.env.example` to `.env` and `.env.test.example` to `.env.test`.
2. Create/configure a MySQL user with permission to create the configured databases.
3. `npm install`
4. `npm run db:init`
5. `npm test`
6. `npm run dev`

Current batch implements Steps 1-5: project/database seed, authentication, shared landing layout, item CRUD/listing UI, and search/filters/geolocation.

## Framework audit
- Bootstrap: navbar, forms, validation, modals, alerts, accordion, dropdown.
- Tailwind: item cards, badges, dashboard, profile, stats.
- Vue 3: requests panel only.
- Tailwind preflight is disabled to avoid Bootstrap resets.

## Unified website flow
The landing page is now the main BorrowBox entry point: hero → live stats → categories → recent listings → five-step borrow journey → safety/FAQ → CTA. The shared navbar continues that journey through Browse, List an Item, Requests, Borrow List, Dashboard, Profile and Admin (for admins). Existing Express/MySQL endpoints are unchanged.
