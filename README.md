# Relics of Return — Web

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue)

The official website and web front-end for **Relics of Return**, a RuneScape Classic private server. The site covers browser play (through the client's own game page), live hiscores, news, the Tradepost (Grand Exchange), interactive world maps, a wiki, game tools and launcher downloads.

It is a [Next.js](https://nextjs.org) application (App Router) that reads game data from `rsc-www`, the stack's API server. The browser never contacts `rsc-www` directly: every request passes through the site's own route handlers under `app/api/*`, which keep the API address and credentials server-side and give the site a single place to enforce access.

## Contents

- [Overview](#overview)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [HTTP API](#http-api)
- [Deployment](#deployment)
- [Related repositories](#related-repositories)
- [Credits and license](#credits-and-license)
- [License](#license)

## Overview

Relics of Return is a non-commercial archival project that preserves the gameplay and social world of early-2000s browser MMORPGs, namely RuneScape Classic (RSC). This repository is the player-facing web application:

- Public pages for the home page, hiscores, news, the Tradepost market, live world maps, the development roadmap and launcher downloads.
- Account registration and login, sharing one account with the game.
- Staff tooling: abuse reports, a command log, news and wiki-guide management, site settings, a world editor and a model editor.
- The game stack is optional for development: the site renders with empty or offline states when `rsc-www` is not reachable, and comes fully alive when it is.

## Features

### Player-facing site

- **Home** — hero section, a live status strip (players online, registered accounts and data-server reachability, polled every 30 seconds) and the latest news, as one featured story and three cards.
- **Play** (`/play`) — a world list with live player counts and world icons. Choosing a world sends the player to that world's own game page, where the client runs standalone; a website deploy, reload or navigation can therefore never interrupt a game. A dedicated offline state is shown when the stack is down.
- **Hiscores** (`/hiscores`) — server-rendered ranking tables for all 19 skills and overall, 16 entries per page, with filters for standard and Ironman rankings. Each player has a lookup page (`/hiscores?username=...`) with a worn-equipment avatar, staff crown, Ironman helm and achievement-diary progress.
- **News** (`/news`, `/news/[id]`) — a paginated archive and full article pages with category badges, dates and images. Missing articles produce a styled 404, and both routes have loading skeletons.
- **Tradepost** (`/tradepost`, `/tradepost/[id]`) — the Grand Exchange-style player market, per world. Summary figures (open offers, trades, items and coins traded in the last 24 hours), a searchable market table with item icons, and per-item pages with price history over 24 hours, 30 days or all time. Prices refresh every 15 seconds; individual traders are never identified.
- **World maps** (`/map`, `/map/world-2`) — live player positions plotted on the classic landscape and refreshed by polling. World 1 and the botting world 2 have separate data feeds, search and marker controls, and distinct colour schemes (gold and moss green).
- **Wiki** — the separate `rsc-wiki` application is proxied under `/wiki`, so wiki pages open on the same origin and every link stays relative.
- **Roadmap** (`/roadmap`) — a development tracker with per-item statuses, progress bars and expandable details, categories ordered by completion and an overall progress header; the content lives in `data/roadmap.ts`.
- **Download** (`/download`) — the desktop launcher page with per-platform installers and an installation FAQ. Release files are served by the site itself: `/downloads/launcher/[file]` for the launcher's signed self-update manifest and installers, and `/downloads/plugins/[...path]` for its Plugin Hub index and plugins.

### Accounts

- **Registration** (`/register`) for standard or Ironman accounts, validated on the client and the server, with data-server result messages for duplicate names, invalid input and per-IP rate limits.
- **Login and logout** (`/login`) with an HTTP session cookie forwarded through the BFF, a session-aware utility bar and mobile menu, and an `/account` page with the signed-in player's personal hiscores.

### Staff tools

- **Administration** (`/admin`) — abuse reports with uploaded screenshots for all staff ranks. Administrators additionally get the command log, news management (Markdown editor with image uploads), guide management for the wiki (create, edit and delete, with revision history and restore) and site settings (the seasonal login theme applied to the game client, and the site-wide Halloween logo). The page only decides what to render — every `/api/admin/*` request is re-checked by `rsc-www`.
- **World editor** (`/map/edit`, administrators) — edit the ground, walls, scenery, doors, NPC and item spawns and lighting of the world both servers run on, with the game's own renderer drawing the working copy in 3D as it is edited. Saving writes every changed sector at once or none, and is refused for any sector modified since it was loaded, so two editors cannot silently overwrite each other.
- **Model editor** (`/models/edit`, administrators) — edit the scenery models in the client's assets, previewed live by the game's renderer. Save writes the model source; Pack rebuilds the game's archives, and players see the change after reloading.

### Platform and infrastructure

- **BFF route handlers** (`app/api/*`) proxy `rsc-www` for status, config, worlds, players, news, hiscores, registration, login, logout, sessions, settings, the Tradepost, staff administration and both editors.
- **CORS-enabled public endpoints** (`/api/worlds`, `/api/settings`, `/api/hiscores`, `/api/tradepost`, `/api/news`) let the standalone game client's side panels read hiscores, market and news data from its own origin.
- **Security headers** on every response: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a strict referrer policy and a closed permissions policy.
- **SEO** — Open Graph and Twitter metadata, dynamic per-page titles, `robots.txt` and `sitemap.xml` route handlers, and route-level loading skeletons.
- **Graceful degradation** — when `rsc-www` is unreachable, every page falls back to an empty or offline state rather than failing.

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16.2 (App Router, React Server Components) |
| UI | React 19, Tailwind CSS 4 (`@theme` tokens), a custom pixel font |
| Language | TypeScript 5 in strict mode |
| Data fetching | Server components and route handlers for first paint; SWR for live polling |
| Validation | Zod (registration and login forms) |
| Components and icons | Radix UI Slot, lucide-react, clsx, tailwind-merge |
| Game data | `@2003scape/rsc-data`, `@2003scape/rsc-world-map`, `@2003scape/rsc-landscape`, `@2003scape/rsc-archiver`, `canvas` |
| Linting | ESLint 9 with `eslint-config-next` |

## Architecture

```text
Browser
 ├─▶ rsc-web (Next.js, port 3000)
 │    ├─ pages / server components ───▶ rsc-www API (port 8888)
 │    ├─ /api/*   BFF route handlers ─▶ rsc-www API (port 8888)
 │    ├─ /wiki/*  (rewrite) ──────────▶ rsc-wiki (port 3010)
 │    └─ /downloads/* ────────────────▶ launcher releases and plugins (read from disk)
 └─▶ play.* — the game client's own page (standalone; the site only links to it)
```

- **One API boundary.** `lib/www.ts` resolves the `rsc-www` address (`RSC_WWW_API_URL`) and fetches JSON for server components and route handlers. Failures throw, and every caller degrades gracefully.
- **Visitor-aware proxying.** In production all requests reach `rsc-www` from the site's host, so register and login would otherwise share a single address for per-IP limits. With `RSC_WWW_PROXY_SECRET` set, the BFF forwards the visitor's address in headers that `rsc-www` trusts only when the shared secret matches.
- **Same-origin wiki.** The `/wiki` rewrite proxies the `rsc-wiki` application, which lets the in-game `::wiki` lookup open `<site>/wiki/search?q=...` while keeping every link relative.
- **Standalone game.** The site links to the game's own page rather than framing it, so nothing the site does — a deploy, a reload, a dev recompile or a navigation — can end a session.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `RSC_WWW_API_URL` | Yes | Server-side address of the `rsc-www` API (default `http://127.0.0.1:8888`). Never exposed to the browser. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Public URL used in metadata, Open Graph tags, `robots.txt` and the sitemap (default `http://127.0.0.1:3000`). |
| `RSC_WWW_PROXY_SECRET` | Production | Shared secret matching `proxySecret` in `rsc-www`'s configuration, so register and login calls forward the visitor's address and per-IP limits apply per visitor. |
| `RSC_WIKI_URL` | Optional | Destination of the `/wiki` rewrite (default `http://127.0.0.1:3010`). |
| `RSC_LANDSCAPE_DIR`, `RSC_CLIENT_DATA_DIR`, `RSC_LOCATIONS_DIR`, `RSC_CLIENT_DIST_DIR`, `RSC_CLIENT_DIR`, `RSC_DATA_CONFIG_DIR`, `RSC_ENVIRONMENTS_FILE` | Editors | Path overrides for the world and model editors when the sibling checkouts are not in their default locations next to this repository. |
| `RSC_MODEL_EDITOR_READONLY` | Optional | Set to `1` to switch saving and packing off in the model editor. |

## Project structure

```text
app/
  (main)/            # site pages: home, play, hiscores, news, tradepost, map,
                     #   download, roadmap, account, login, register, admin, models/edit
  api/               # BFF route handlers — the only endpoints the browser calls
  downloads/         # launcher self-update and Plugin Hub file routes
  layout.tsx         # root layout and global metadata
  globals.css        # Tailwind theme tokens
  robots.ts, sitemap.ts
components/
  layout/ sections/ ui/         # navigation, footer, hero, buttons, skeletons
  players/ news/ tradepost/     # crowns, avatars, article and market pieces
  world-map/ model-editor/      # map, world editor and model editor interfaces
  admin/ auth/ roadmap/ account/ play/ shared/ skills/
data/                # navigation, skills, Ironman helms, staff ranks, roadmap, news
hooks/               # useAuth, useServerStatus, usePlayerPositions, useSiteSettings
lib/                 # API client, types, server fetchers, items, tradepost, play,
                     #   site settings, utilities; landscape/ and models/ back the editors
public/              # logos, crowns, item and skill sprites, game-mode badges, splash
downloads/           # published launcher releases and plugin files (git-ignored)
scripts/             # temper-badges.py — generates the tempered Ironman helms
types/               # ambient type declarations
```

## HTTP API

All routes below are served by rsc-web under its own origin; those under `/api/*` proxy `rsc-www` server-side.

### Public data

| Route | Description |
| --- | --- |
| `GET /api/status` | Live server status: players online, registered accounts, data-server reachability. |
| `GET /api/config` | Server name, browser client URL and the skill list. |
| `GET /api/worlds` | Live world list (CORS-open for the game client's world switcher). |
| `GET /api/players?world=N` | Live player positions for the world maps. |
| `GET /api/news`, `GET /api/news/image` | News listings and articles, and article images. |
| `GET /api/hiscores`, `GET /api/hiscores/player` | Ranking tables and per-player ranks. |
| `GET /api/tradepost?world=N`, `GET /api/tradepost/[id]` | Market data enriched with item names and icons. |
| `GET /api/settings` | Public site settings, such as the login theme and logo (CORS-open). |
| `GET /api/guides/image?name=...` | Uploaded wiki-article images. |
| `GET /downloads/launcher/[file]` | Launcher manifest and signed installers, read from disk on every request. |
| `GET /downloads/plugins/[...path]` | Plugin Hub index and plugin files, read from disk on every request. |

### Accounts and sessions

| Route | Description |
| --- | --- |
| `POST /api/register` | Create a standard or Ironman account. |
| `POST /api/login`, `POST /api/logout` | Start and end a session (HTTP cookie). |
| `GET /api/session` | The current session — `{ username }` or `null`. |

### Administration

| Route | Description |
| --- | --- |
| `/api/landscape/*` | World editor: sector reads and writes, batch edits, palette, locations, lighting, 3D previews and conflict checks. Administrator session required; enforced by `rsc-www`. |
| `/api/models/*` | Model editor: model sources, textures, packing and file-change events. Administrator session required; enforced by `rsc-www`. |
| `/api/admin/*` | Staff tools: abuse reports (list, detail, screenshots, resolve), the command log, news management, guide management and site settings. Staff rank required; re-checked by `rsc-www` on every request. |

## Deployment

The production site runs on Vercel and is redeployed on every push to this repository. The API (`rsc-www`), the game client files and the game worlds run on the stack's own server, reached through a Cloudflare Tunnel; the wiki can run on that server or as its own project. Production variables are `RSC_WWW_API_URL`, `RSC_WWW_PROXY_SECRET`, `NEXT_PUBLIC_SITE_URL` and `RSC_WIKI_URL`.

For the full walkthrough — DNS, tunnel ingress, worlds and certificates — see `documentation/PRODUCTION_HOSTING.md` in the stack.

## Related repositories

This repository is one component of the Relics of Return stack, developed together with `rsc-client` (browser game client), `rsc-server` (game server), `rsc-data-server` (account and world persistence), `rsc-data` (shared game data), `rsc-www` (the website's API), `rsc-wiki` (the data-driven wiki), `rsc-manager` (service manager and dashboard) and the Tauri-based desktop launcher. The GitHub organisation is at <https://github.com/Relics-of-Return>.

## Credits and license

- **[2003Scape](https://github.com/2003scape)**: the client, server and data projects this is built on.
- **[OSRS World](https://osrs.world/)**: the world map editor's interface is based on theirs.

## License

Released under the AGPL-3.0-or-later licence, matching the 2003Scape stack this project builds on.

RuneScape and RuneScape Classic are registered trademarks of Jagex Limited. Relics of Return is an independent, non-commercial preservation project and is not endorsed by, sponsored by or affiliated with Jagex Ltd.
