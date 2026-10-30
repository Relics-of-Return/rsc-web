import { SITE_URL } from '@/lib/config'
import {
  DISCORD_URL,
  GITHUB_URL,
  SERVER_LIST_URL,
  SERVER_LIST_VOTE_URL,
  SITE_NAME,
  SITE_TAGLINE,
} from '@/lib/constants'

export function getLlmsTxt(): string {
  return `# ${SITE_NAME}

> ${SITE_TAGLINE}

Relics of Return is an open-source RuneScape Classic (RSC) private server and emulation platform. It delivers an authentic 2003 retro MMORPG experience paired with modern web technologies, seamless browser-based play, cross-platform desktop clients, real-time hiscores, an in-game trade post, and continuous quality-of-life improvements.

## Play & Client Downloads
- [Play in Browser](${SITE_URL}/play): Instant in-browser game client powered by WebGL/Canvas, requiring no download or local installation.
- [Download Desktop Launcher](${SITE_URL}/download): Cross-platform standalone desktop launcher for Windows, macOS, and Linux with auto-updates and enhanced performance.

## World & Community Features
- [Live Hiscores](${SITE_URL}/hiscores): Real-time leaderboards tracking overall levels, experience, and individual skill rankings (Attack, Defense, Strength, Hits, Ranged, Prayer, Magic, Cooking, Woodcutting, Fletching, Fishing, Firemaking, Crafting, Smithing, Mining, Herblaw, Agility, Thieving).
- [Player Trade Post](${SITE_URL}/tradepost): Live marketplace and search engine for player-to-player trading and item listings.
- [World Map](${SITE_URL}/map): Interactive 2D map of Gielinor with landmarks, dungeons, wilderness areas, and point-of-interest markers.
- [Development Roadmap](${SITE_URL}/roadmap): Project milestones, completed features, active developments, and planned expansions.
- [News & Updates](${SITE_URL}/news): Official patch notes, community announcements, and release write-ups.
- [Server Status](${SITE_URL}/status): Real-time world availability, uptime statistics, and concurrent player counts.

## Community & Resources
- [Wiki](https://wiki.relicsofreturn.com): Comprehensive game guides, item databases, quest walkthroughs, bestiary, and skill mechanics.
- [Discord](${DISCORD_URL}): Official community discussion, support, clans, and real-time announcements.
- [GitHub](${GITHUB_URL}): Open-source codebases for the game server, client, and web applications.
- [Server List](${SERVER_LIST_URL}): Community directory and [Vote Page](${SERVER_LIST_VOTE_URL}).

## Public APIs for AI Agents & Tools
- \`${SITE_URL}/api/status\`: Real-time JSON health check reporting online status and player counts.
- \`${SITE_URL}/api/worlds\`: Metadata and connection configurations for active worlds.
- \`${SITE_URL}/api/ticker\`: Live game news ticker and announcements.
- \`${SITE_URL}/api/hiscores\`: Read-only REST hiscores endpoints for player lookups and skill standings.
- \`${SITE_URL}/api/tradepost\`: Read-only endpoints for current market listings.
`
}

export function getLlmsFullTxt(): string {
  return `${getLlmsTxt()}

---

## Detailed Game Specifications

### Core Design Philosophy
- Authentic 2003-era RuneScape Classic game loop, tick rates, combat mechanics, and graphics.
- Fair and transparent progression: 1x authentic XP rate milestones with optional Iron Man and Ultimate Iron Man challenge modes.
- Strict anti-bot protections, modern account security, and active community moderation.
- Zero pay-to-win mechanics: all cosmetic and gameplay perks are earned through in-game dedication.

### Supported Platforms
- **Web Browser**: Chromium, Firefox, Safari, Edge with WebGL/HTML5 Canvas support.
- **Windows**: x64 desktop launcher with hardware-accelerated rendering.
- **macOS**: Apple Silicon (M1/M2/M3/M4) and Intel builds.
- **Linux**: AppImage and native binaries.

### Skills Included
1. Attack
2. Defense
3. Strength
4. Hits (Hitpoints)
5. Ranged
6. Prayer
7. Magic
8. Cooking
9. Woodcutting
10. Fletching
11. Fishing
12. Firemaking
13. Crafting
14. Smithing
15. Mining
16. Herblaw
17. Agility
18. Thieving

### Contact & Support
For bugs, appeals, or technical assistance, join the official Discord server at ${DISCORD_URL}.
`
}

export function getRouteMarkdown(pathname: string): string {
  const cleanPath = pathname.replace(/\/+$/, '')

  switch (cleanPath) {
    case '':
    case '/':
    case '/llms.txt':
      return getLlmsTxt()

    case '/llms-full.txt':
      return getLlmsFullTxt()

    case '/play':
      return `# Play ${SITE_NAME} in Browser

> Launch and play directly in your web browser with zero installation.

- **URL**: ${SITE_URL}/play
- **Requirements**: Any modern web browser with WebGL and HTML5 support (Chrome, Firefox, Safari, Edge, Brave, Opera).
- **Controls**: Mouse for movement and interactions; keyboard for chat and hotkeys.
- **Save State**: Progress is stored securely on the server; log in from any device to continue your adventure.
- **Desktop Alternative**: If you prefer a dedicated window or experience browser lag, download the [Desktop Launcher](${SITE_URL}/download).
`

    case '/download':
      return `# Download ${SITE_NAME} Desktop Launcher

> Native, high-performance game client for Windows, macOS, and Linux.

- **URL**: ${SITE_URL}/download
- **Platforms**:
  - Windows (Installer & Portable .exe)
  - macOS (.dmg for Apple Silicon & Intel)
  - Linux (AppImage & tarball)
- **Features**:
  - Automatic background client updates
  - Custom window scaling, high-DPI resolution, and fullscreen mode
  - Built-in screenshot and session tools
  - Lower latency and CPU overhead compared to web browsers
`

    case '/roadmap':
      return `# ${SITE_NAME} Development Roadmap

> Transparent development progress, completed milestones, and upcoming features.

- **URL**: ${SITE_URL}/roadmap
- **Overview**: Relics of Return is actively maintained with regular feature drops, bug fixes, engine improvements, and content additions.
- **Tracking**: Check ${SITE_URL}/roadmap for the live Kanban status of all client, server, and content milestones.
`

    case '/hiscores':
      return `# ${SITE_NAME} Live Hiscores

> Real-time skill rankings, player levels, and experience milestones.

- **URL**: ${SITE_URL}/hiscores
- **API Endpoint**: ${SITE_URL}/api/hiscores
- **Categories**:
  - Overall Rank (Total Level & Total XP)
  - 18 Individual Skills (Combat & Non-Combat)
  - Game Modes: Standard, Regular Iron Man, Ultimate Iron Man, Hardcore Iron Man
`

    case '/tradepost':
      return `# ${SITE_NAME} Player Trade Post

> In-game player trading marketplace and item listings.

- **URL**: ${SITE_URL}/tradepost
- **API Endpoint**: ${SITE_URL}/api/tradepost
- **Features**: Browse buy and sell offers, search by item name, verify prices, and coordinate peer-to-peer trades.
`

    case '/status':
      return `# ${SITE_NAME} Server Status

> Live server health, world status, and uptime metrics.

- **URL**: ${SITE_URL}/status
- **JSON API**: ${SITE_URL}/api/status
- **World Status**: Indicates whether game worlds are online, current player population, and maintenance schedules.
`

    case '/map':
      return `# ${SITE_NAME} Interactive World Map

> High-resolution 2D tile map of Gielinor.

- **URL**: ${SITE_URL}/map
- **Coverage**: Lumbridge, Varrock, Falador, Wilderness, Karamja, Entrana, and subterranean dungeon networks.
`

    case '/news':
      return `# ${SITE_NAME} News & Announcements

> Official game updates, patch notes, and community event notices.

- **URL**: ${SITE_URL}/news
- **JSON API**: ${SITE_URL}/api/news
`

    default:
      return getLlmsTxt()
  }
}

