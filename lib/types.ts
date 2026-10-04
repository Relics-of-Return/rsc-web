import type { PlayerAppearance } from './avatar'

/** Live server status as returned by rsc-www's `/api/status`. */
export interface ServerStatusData {
  /** Number of registered accounts (from the data server). */
  registered: number
  /** Number of players currently online across all worlds. */
  online: number
  /** Whether the website currently has a connection to the data server. */
  connected: boolean
  /** Unix timestamp (seconds) when the web server started, if reported. */
  startedAt?: number
}

/** Site configuration as returned by rsc-www's `/api/config`. */
export interface SiteConfig {
  serverName: string
  /** URL of the in-browser game client served by rsc-client. */
  clientURL: string
  /** Ordered skill names usable as hiscore tabs. */
  skills: string[]
}

/** A single game world as returned by rsc-www's `/api/worlds`. */
export interface WorldEntry {
  id: number
  /** Display name, e.g. "World 2" — set per world in rsc-www's config. */
  name?: string
  country?: string
  members?: boolean | number
  players?: number
  online?: boolean | number
  /** True on a world where botting is allowed (world 2). */
  botting?: boolean
  /** Client URL that reaches this particular world. */
  clientURL?: string
  [key: string]: unknown
}

/** Worlds list as returned by rsc-www's `/api/worlds`. */
export interface WorldsData {
  worlds: WorldEntry[]
}

/** One row of a skill ranking as returned by rsc-www's `/api/hiscores`. */
export interface HiscoreRank {
  username: string
  level: number
  experience: number
  /** Staff rank, drawn as a crown in front of the username (0 = player). */
  staffRank?: number
  /** Account type: 0 standard, 1 Ironman. */
  accountMode?: number
  /** How far the diaries have tempered an Ironman's helm, 0 (iron) to 4 (rune). */
  temper?: number
}

/** Skill ranking table as returned by rsc-www's `/api/hiscores`. */
export interface HiscoresData {
  ranks: HiscoreRank[]
  pages?: number
}

/**
 * A player's achievement diaries as the lookup shows them: per area, how many
 * tiers are complete and how many claimed, and the Ironman helm's temper.
 */
export interface DiarySummary {
  temper: number
  complete: Record<string, number>
  claimed: Record<string, number>
}

/** Per-skill rank of a single player. */
export interface PlayerRank {
  rank: number
  level: number
  experience: number
}

/** Player lookup as returned by rsc-www's `/api/hiscores/player`. */
export interface PlayerRanksData {
  /** null when the player could not be found. */
  ranks: Record<string, PlayerRank> | null
  /** Staff rank, drawn as a crown in front of the username (0 = player). */
  staffRank?: number
  /** Account type: 0 standard, 1 Ironman. */
  accountMode?: number
  /** How far the player's achievement diaries have got. */
  diaries?: DiarySummary | null
  /** The character sprites, colours and equipment to draw the avatar with. */
  appearance?: PlayerAppearance | null
}

/** News article as returned in list responses (contains a summary). */
export interface NewsSummaryArticle {
  id: number
  title: string
  /** 0 = Website, 1 = Game, 2 = Technical. */
  category: number
  /** Unix timestamp in seconds. */
  date: number
  summary: string
}

/** Single article response contains the full body. */
export interface NewsFullArticle extends NewsSummaryArticle {
  body: string
}

/** Paginated news list as returned by rsc-www's `/api/news?page=N`. */
export interface NewsListData {
  articles: NewsSummaryArticle[]
  pages?: number
}

/** Single article as returned by rsc-www's `/api/news?id=N`. */
export interface NewsArticleData {
  articles: NewsFullArticle | null
}

/** News management response returned to administrators. */
export interface AdminNewsData {
  articles: NewsSummaryArticle[]
  pages?: number
}

export interface AdminNewsArticleData {
  articles: NewsFullArticle | null
}

/** A wiki article summary, as returned by rsc-www's `/api/guides`. */
export interface GuideSummary {
  id: number
  slug: string
  title: string
  description: string
  /** 'guide' or 'quest' (a quest walkthrough). */
  category: string
  /** Unix timestamps in seconds. */
  createdDate: number
  updatedDate: number
}

/** A wiki article with its markdown body. */
export interface GuideArticle extends GuideSummary {
  body: string
}

/** One saved snapshot of a wiki article, from guide_revisions. */
export interface GuideRevision {
  id: number
  guideId: number
  slug: string
  title: string
  category: string
  editor: string
  revisionDate: number
}

/** Guide list as returned by rsc-www's `/api/admin/guides`. */
export interface AdminGuidesData {
  guides: GuideSummary[]
}

/** One guide as returned by rsc-www's `/api/admin/guides?id=`. */
export interface AdminGuideData {
  guide: GuideArticle | null
}

/** Revision list as returned by rsc-www's `/api/admin/guides?revisions=`. */
export interface GuideRevisionsData {
  revisions: GuideRevision[]
}

/**
 * The game client's login scenes (rsc-client's src/title-screen.js), or
 * `seasonal` for the one the time of year calls for.
 */
export type LoginTheme = 'seasonal' | 'default' | 'halloween' | 'christmas' | 'easter'

/**
 * The site's settings, as rsc-www's `/api/settings` returns them. Changed by
 * administrators from the admin section.
 */
export interface SiteSettings {
  /** Show the Halloween logo, its letters burning green, in place of the usual one. */
  halloweenLogo: boolean
  /** The login scene every player's game client shows. */
  loginTheme: LoginTheme
}

/** Session lookup as returned by rsc-www's `/api/session`. */
export interface SessionData {
  username: string | null
  /** Staff rank of the logged in player (0 = player). */
  rank?: number
}

/** Registration result as returned by rsc-www's `/api/register`. */
export interface RegisterResult {
  success: boolean
  /** Data-server result code (see lib/validations REGISTER_MESSAGES). */
  code: number
}

/** Login result as returned by rsc-www's `/api/login`. */
export interface LoginResult {
  success: boolean
  username?: string
  /** Staff rank of the logged in player (0 = player). */
  rank?: number
  error?: string
}

/** Logout result as returned by rsc-www's `/api/logout`. */
export interface LogoutResult {
  success: boolean
}

/** A player's position on the map as returned by rsc-www's `/api/players`. */
export interface PlayerPosition {
  username: string
  x: number
  y: number
  world: number
  plane: number
  /** Staff rank, drawn as a crown on the player's map marker (0 = player). */
  rank?: number
}

/** Player positions as returned by rsc-www's `/api/players`. */
export interface PlayersData {
  players: PlayerPosition[]
  count: number
  /** Which world these positions came from. */
  world?: number
}

/**
 * An abuse report filed with the in-game report form, as returned by
 * rsc-www's `/api/admin/reports`. Staff only.
 */
export interface AbuseReport {
  id: number
  /** Unix timestamp (seconds) the report was filed. */
  date: number
  /** Username that filed the report. */
  reporter: string
  /** Staff rank of the reporter, drawn as a crown (0 = player). */
  reporter_rank: number
  /** Username being reported. */
  accused: string
  /** 1-based index into the 12 rules (see data/offences.ts). */
  offence: number
  /** Whether a moderator muted the accused for 48 hours when reporting. */
  muted: boolean
  /** World the report came from. */
  world: number
  /** Whether a staff member has already dealt with the report. */
  handled: boolean
  /** Staff member who resolved it, null while open. */
  handled_by: string | null
  /** Unix timestamp (seconds) it was resolved, 0 while open. */
  handled_date: number
  /** Whether the server recorded a snapshot (chat log, positions...) with it. */
  has_details: boolean
  /** Whether the reporter's client uploaded a screenshot with it. */
  has_screenshot: boolean
}

/** Abuse report queue as returned by rsc-www's `/api/admin/reports`. */
export interface AbuseReportsData {
  reports: AbuseReport[]
  pages?: number
  /** Number of reports still waiting to be dealt with. */
  unhandled?: number
}

/** Result of resolving or reopening a report. */
export interface ResolveReportResult {
  success: boolean
}

/**
 * One entry in the staff command log, as returned by rsc-www's
 * `/api/admin/logs`. Append only: entries are never edited or deleted.
 */
export interface StaffLogEntry {
  id: number
  /** Unix timestamp (seconds) the action was taken. */
  date: number
  /** 'game' for a command used in game, 'website' for a site action. */
  source: 'game' | 'website'
  /** World the command was used on, 0 for website actions. */
  world: number
  /** Staff member who used it. */
  staff: string
  /** Their staff rank when they used it (drawn as a crown). */
  staff_rank: number
  /** Command id, e.g. 'mute', 'rank', 'resolve_report'. */
  command: string
  /** Player it was used on, '' when there was no target. */
  target: string
  /** The context: mute length, new rank, report id... */
  args: string
  /** Whether it went through; false for a refused attempt. */
  success: boolean
  /** Why it was refused, '' when it went through. */
  reason: string
}

/** Staff command log page as returned by rsc-www's `/api/admin/logs`. */
export interface StaffLogsData {
  logs: StaffLogEntry[]
  pages?: number
  /**
   * The commands a filter may pick, with friendly names. rsc-www returns this
   * the way it returns `offences` with reports, so the panel never keeps its
   * own copy of the list.
   */
  commands?: { id: string; name: string }[]
}

/** One thing a player said, heard or did, as recorded by the game server. */
export interface ChatActivity {
  /** Unix timestamp (milliseconds). */
  t: number
  type: 'chat'
  from: string
  text: string
}

export interface PrivateMessageActivity {
  t: number
  type: 'pm'
  /** 'in' when the recorded player received it, 'out' when they sent it. */
  dir: 'in' | 'out'
  with: string
  text: string
}

export interface TradeItem {
  id: number
  name: string
  amount: number
}

export interface TradeActivity {
  t: number
  type: 'trade'
  with: string
  gave: TradeItem[]
  got: TradeItem[]
}

export type ActivityEntry = ChatActivity | PrivateMessageActivity | TradeActivity

/** Where a player stood, sampled about every five seconds while moving. */
export interface TrailPoint {
  t: number
  x: number
  y: number
  plane: number
}

/** What the game server saw of one player when the report was filed. */
export interface SnapshotPlayer {
  username: string
  rank: number
  x: number
  y: number
  plane: number
  combatLevel: number
  skulled: boolean
  muted: boolean
  inCombat: boolean
  /** Players that player's client was drawing: who could have seen it. */
  witnesses: string[]
  log: ActivityEntry[]
  trail: TrailPoint[]
}

/** The accused may have logged off before the server could look at them. */
export type SnapshotAccused =
  | { online: false; username: string }
  | (SnapshotPlayer & {
      online: true
      /** Tiles between accused and reporter, null on different floors. */
      distance: number | null
      /** Other accounts on this world logged in from the same address. */
      sameNetwork: string[]
    })

/** Recorded by the game server itself when the report was filed. */
export interface ReportSnapshot {
  version: number
  /** Unix timestamp (milliseconds) the snapshot was taken. */
  capturedAt: number
  reporter: SnapshotPlayer
  accused: SnapshotAccused
}

/** Account facts about a reported or reporting player, read when viewed. */
export interface ReportPlayerFacts {
  username: string
  rank: number
  totalLevel: number
  /** Unix timestamp (seconds). */
  createdAt: number
  lastLogin: number
  online: boolean
  world: number
  /** 0 = not muted, -1 = permanently, otherwise unix time (seconds) it ends. */
  mutedUntil: number
  bannedUntil: number
  /** Other accounts created from, or last logged in from, the same address. */
  alts: string[]
}

export interface ReportHistoryItem {
  id: number
  date: number
  reporter: string
  offence: number
  handled: boolean
}

/** Everything known about one report, as returned by `/api/admin/reports/detail`. */
export interface AbuseReportDetail {
  report: Omit<AbuseReport, 'has_details' | 'has_screenshot'>
  /** null for reports filed before snapshots existed. */
  context: ReportSnapshot | null
  /** Uploaded by the reporter's client; null when there isn't one. */
  screenshot: { size: number; type: string; date: number } | null
  accused: ReportPlayerFacts | null
  reporter: ReportPlayerFacts | null
  history: {
    /** Reports ever filed against the accused, including this one. */
    against: number
    /** Reports ever filed by the reporter, including this one. */
    byReporter: number
    /** The accused's other recent reports, newest first. */
    previous: ReportHistoryItem[]
  }
}

// ---- Tradepost -------------------------------------------------------------
// rsc-www's /api/tradepost and /api/tradepost/item (see rsc-data-server's
// src/tradepost-market.js). dates are unix seconds

/** One side of an item's market: the best price, and how much is on offer. */
export interface TradepostQuote {
  /** The most a buyer will pay, or the least a seller will take. */
  price: number
  /** Everything still wanted or for sale, across all prices. */
  quantity: number
  offers: number
}

/** An order book row: everything on offer at one price. */
export type TradepostPriceLevel = TradepostQuote

export interface TradepostTrade {
  price: number
  amount: number
  date: number
}

/** How an item traded over a period, and how far its price moved. */
export interface TradepostStats {
  trades: number
  volume: number
  /** Average price per item, weighted by amount. */
  average: number | null
  low: number | null
  high: number | null
  /** Last price minus the price at the start of the period. */
  change: number | null
  changePercent: number | null
}

export interface TradepostMarketItem {
  id: number
  /** Highest open buy offer. */
  buy: TradepostQuote | null
  /** Lowest open sell offer: the buyout. */
  sell: TradepostQuote | null
  last: TradepostTrade | null
  /** Trades and items traded, all time. */
  trades: number
  volume: number
  day: TradepostStats | null
  month: TradepostStats | null
}

export interface TradepostTotals {
  openOffers: number
  listedItems: number
  tradedItems: number
  dayTrades: number
  dayVolume: number
  dayValue: number
  /** When the first trade was recorded, or null before any. */
  trackedSince: number | null
}

export interface TradepostMarketData {
  world: number
  now: number
  totals: TradepostTotals
  items: TradepostMarketItem[]
}

/** One bucket of an item's price history. */
export interface TradepostHistoryPoint {
  /** Start of the bucket. */
  time: number
  volume: number
  average: number
  low: number
  high: number
}

export interface TradepostHistory {
  /** Bucket size in seconds. */
  bucket: number
  since: number
  points: TradepostHistoryPoint[]
}

export type TradepostRange = 'day' | 'month' | 'all'

export interface TradepostItemDetail {
  now: number
  id: number
  buy: TradepostQuote | null
  sell: TradepostQuote | null
  last: TradepostTrade | null
  trackedSince: number | null
  stats: Record<TradepostRange, TradepostStats>
  orderBook: {
    buying: TradepostPriceLevel[]
    selling: TradepostPriceLevel[]
  }
  /** Newest first. */
  trades: TradepostTrade[]
  history: Record<TradepostRange, TradepostHistory>
}

export interface TradepostItemData {
  world: number
  item: TradepostItemDetail
}
