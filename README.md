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

## User flow
Guests who open the landing page see the hero, then a 4 second notice sends them to the login page (which links to Register). Use `/?stay=1` or the "Stay on this page" button to skip that. After login the Dashboard shows the account details (name, email, student ID, phone, department, campus area) with a Logout button. The navbar also shows who is signed in with a Logout option on every page.

## Location features
- **List an Item > Use my current location** fills the *Campus location* box with a place name (looked up through OpenStreetMap, falls back to `lat, lng`) and saves the coordinates.
- **Browse > Find Near Me** filters by distance and sorts nearest first. Demo listings are seeded with campus coordinates.
- Browsers only allow geolocation on `https://` or `http://localhost`. Open the app at `http://localhost:3000`, not a LAN IP.

## Demo accounts
Running `npm run db:init` seeds 10 synthetic student accounts and demo campus activity. All demo users use password `Borrow123`.

| Email | Student ID |
|---|---|
| 24bce307@nirmauni.ac.in | 24BCE307 |
| 24bce118@nirmauni.ac.in | 24BCE118 |
| 23bce214@nirmauni.ac.in | 23BCE214 |
| 24bee041@nirmauni.ac.in | 24BEE041 |
| 23bee087@nirmauni.ac.in | 23BEE087 |
| 24btm052@nirmauni.ac.in | 24BTM052 |
| 23btm019@nirmauni.ac.in | 23BTM019 |
| 22bce156@nirmauni.ac.in | 22BCE156 |
| 22bee063@nirmauni.ac.in | 22BEE063 |
| 24bce225@nirmauni.ac.in | 24BCE225 |

These are demo-only credentials. Change/remove the seed before any real deployment.
