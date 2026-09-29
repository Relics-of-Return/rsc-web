# 2003Scape Web

Modern frontend for the [2003Scape](https://github.com/2003scape) RuneScape Classic private
server, inspired by the RS-Realm reference site (`../Website`). Built with Next.js (App Router),
TypeScript, Tailwind CSS 4 and SWR.

It replaces the static pages of `rsc-www` with a polished, responsive experience while keeping
`rsc-www` as the API/backend server.

## Features (Phases 1–5)

- Dark "classic stone + gold" design system (Tailwind 4 `@theme` tokens)
- Sticky navigation with utility bar showing **live server status** (players online, registered
  accounts, data-server connectivity) polled every 30 seconds
- Home page with hero, live status strip, feature highlights and the **three latest news articles**
- **Hiscores** — server-rendered ranking tables for all 18 skills + overall, with pagination and
  per-player rank lookup (`/hiscores?username=...`)
- **News** — paginated article list (`/news`), full article pages (`/news/[id]`) with
  category/date metadata and graceful 404 for missing articles
- **Server status page** (`/status`) — live world table (world, country, type, players, status)
- **Play page** (`/play`) — the browser client embedded full-width from the real client URL in
  `/api/config` (the client hides its own header when framed), with a graceful "stack offline" state
- **Accounts** — registration (`/register`) with client + server validation and data-server
  result-code messages (duplicate name, per-IP 5-minute rate limit, …), login (`/login`) with
  session cookie forwarded through the BFF, logout, session-aware utility bar/mobile menu and an
  `/account` page featuring **personal hiscores** with a link to the public profile
- **Staff crowns** — moderators and administrators wear their crown in front of their username
  in the hiscores, the player lookup, the utility bar, `/account` and on the world map, matching
  the crown the game client draws in chat (see `../docs/staff-ranks.md`)
- **Site settings** — under Site Settings in `/admin`, administrators pick the game client's login
  theme for every player (Stone Hall, Halloween, Christmas, Easter or by season; players can't
  change it in the game) and switch the Halloween logo (the letters burning with green ghost-fire,
  `public/brand/logo-halloween*.gif`) on for the whole site. rsc-www keeps the settings. The layout
  reads them on every request, so the right logo is there from the first paint, and the client
  reads the theme from `/api/settings`, which any origin may fetch
- **Roadmap** (`/roadmap`) — development tracker with per-item status badges, progress bars and
  expandable details (completed/planned features, known issues), collapsible categories sorted by
  completion, and an overall-progress header. Content lives in `data/roadmap.ts`.
- **Polish (Phase 5)** — route-level loading skeletons (`loading.tsx` for hiscores, news, article
  and status), full SEO metadata (Open Graph/Twitter, keywords, `metadataBase`, `themeColor`
  viewport), dynamic page titles (per-skill and per-player hiscores pages), `robots.txt` and
  `sitemap.xml` route handlers
- BFF route handlers (`app/api/*`) proxying rsc-www (`/api/status`, `/api/config`, `/api/worlds`,
  `/api/news`, `/api/hiscores`, `/api/hiscores/player`, `/api/register`, `/api/login`,
  `/api/logout`, `/api/session`, `/api/settings`) so the browser never talks to rsc-www directly

## Planned (later)

- Store / vote features (require new backend endpoints)
- In-game mail and account settings on `/account`

## Getting started

```bash
npm install
cp .env.example .env.local   # point RSC_WWW_API_URL at rsc-www
npm run dev
```

Requires the 2003Scape stack running (see the root `manager.cmd`): rsc-data-server (port 9001),
rsc-www (port 8888), and optionally rsc-server/rsc-client for gameplay.

- Website (this app): http://127.0.0.1:3000
- rsc-www API: http://127.0.0.1:8888

## Project structure

```text
app/            # App Router pages, layouts and BFF route handlers
components/     # layout/, sections/, ui/ building blocks
data/           # navigation and static content definitions
hooks/          # client-side polling hooks (useServerStatus)
lib/            # typed API client, shared types, utilities
```

## License

AGPL-3.0-or-later (matching the 2003Scape stack).
