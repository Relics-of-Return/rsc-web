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
  /** Set on a world only the signed-in users it is kept for can see. */
  private?: boolean
  members?: boolean | number
  players?: number
  online?: boolean | number
  /** True on a world where botting is allowed (world 2). */
  botting?: boolean
  /** The release the world runs: "live", or "beta" for the beta world. */
  channel?: string
  /** Client URL that reaches this particular world — the launcher and a local
   *  stack read the launch string in its hash. */
  clientURL?: string
  /** The game page the site sends a player to, e.g.
   *  https://play.relicsofreturn.com/?world=1. Falls back to clientURL. */
  playURL?: string
  /** The world's socket for a game page served over TLS, e.g.
   *  wss://play.relicsofreturn.com/ws/1. */
  websocketURL?: string
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
  staffRank?: number
  accountMode?: number
  temper?: number
  /** Null when the character has not chosen a mode yet; absent on an old API. */
  gameMode?: GameMode | null
  /** When the skill reached 200M (unix seconds); unset for an earlier one. */
  maxedAt?: number | null
}

/** Skill ranking table as returned by rsc-www's `/api/hiscores`. */
export interface HiscoresData {
  ranks: HiscoreRank[]
  pages?: number
}

/** A skill milestone the records keep: level 99, or the 200M cap. */
export type HiscoreMilestone = '99' | '200m'

/** A player reaching a milestone in a skill, from `/api/hiscores/records`. */
export interface HiscoreRecord {
  skill: string
  username: string
  /** Unix seconds. */
  date: number
  staffRank: number
  accountMode: number
  temper: number
}

/** How many players have a milestone in a skill, and how many are Ironmen. */
export interface MilestoneCount {
  all: number
  ironman: number
}

/** The records for one milestone on one world, from `/api/hiscores/records`. */
export interface HiscoreRecordsData {
  world: number
  milestone: HiscoreMilestone
  /** The first player to reach it in each skill that has one. */
  firsts: HiscoreRecord[]
  /** Everyone who has, newest first, one page of them. */
  entries: HiscoreRecord[]
  pages: number
  /** Per skill, plus `every` for all of them at once; null until first counted. */
  counts: Record<string, MilestoneCount> | null
  /** When the counts were taken (unix seconds). */
  countedAt: number
}

/** One row of the collection log rankings, from `/api/hiscores/collection`. */
export interface CollectionLogRank {
  rank: number
  username: string
  /** How many unique items they have logged. */
  collections: number
  /** How many sources (e.g. a monster) they have every item of. */
  completions: number
  staffRank: number
  accountMode: number
  temper: number
}

/** One page of a world's collection log rankings, from `/api/hiscores/collection`. */
export interface HiscoreCollectionData {
  world: number
  page: number
  pages: number
  pageSize: number
  /** How many players have anything logged. */
  total: number
  /** Every distinct item the log can hold (the "124 / 480" denominator). */
  totalEntries: number
  /** How many sources a completion can be made of. */
  totalSources: number
  /** When the ranks were rebuilt (unix seconds); 0 before the first rebuild. */
  countedAt: number
  rows: CollectionLogRank[]
}

/** One row of the vote hiscores, from `/api/hiscores/votes`. */
export interface VoteRank {
  rank: number
  username: string
  /** Every toplist vote the account has cast. */
  votes: number
  /** When the latest was cast (unix seconds). */
  lastVoteAt: number
  staffRank: number
  accountMode: number
  temper: number
  /** Null when the character has not chosen a mode yet. */
  gameMode?: GameMode | null
}

/** Which votes the vote hiscores count: this month's (UTC) or every one. */
export type VotePeriod = 'month' | 'all'

/** One page of the vote hiscores (account-wide), from `/api/hiscores/votes`. */
export interface HiscoreVotesData {
  world: number
  period: VotePeriod
  /** The first second counted (unix seconds); 0 for all time. */
  since: number
  page: number
  pages: number
  pageSize: number
  /** How many accounts have voted. */
  total: number
  /** Every vote cast, by everyone. */
  totalVotes: number
  rows: VoteRank[]
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

/** A character's game mode: tier 0 Normal to 3 Realism, path 0 none to 4 Noble. */
export interface GameMode {
  tier: number
  path: number
}

/** Per-skill rank of a single player. */
export interface PlayerRank {
  rank: number
  level: number
  experience: number
}

/** How much of the collection log a player has found, from `/api/hiscores/player`. */
export interface PlayerCollectionLog {
  /** How many unique items they have logged. */
  collections: number
  /** How many sources they have every item of. */
  completions: number
  /** Every distinct item the log can hold. */
  total: number
}

/** Player lookup as returned by rsc-www's `/api/hiscores/player`. */
export interface PlayerRanksData {
  /** null when the player could not be found. */
  ranks: Record<string, PlayerRank> | null
  /** Staff rank, drawn as a crown in front of the username (0 = player). */
  staffRank?: number
  /** Account type: 0 standard, 1 Ironman. */
  accountMode?: number
  /** Null when the character has not chosen a mode yet; absent on an old API. */
  gameMode?: GameMode | null
  questPoints?: number
  /** How far the player's achievement diaries have got. */
  diaries?: DiarySummary | null
  /** When each skill reached 99 and 200M (unix seconds), since tracking began. */
  milestones?: Record<string, Partial<Record<HiscoreMilestone, number>>> | null
  /** The collection log summary, or null when the data server doesn't know it. */
  collection?: PlayerCollectionLog | null
  /** Every toplist vote the account has cast, or null when the ledger can't be asked. */
  votes?: number | null
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
  trackedSince: number | null
}

export interface TradepostMarketData {
  world: number
  now: number
  totals: TradepostTotals
  items: TradepostMarketItem[]
}

export interface TradepostHistoryPoint {
  time: number
  volume: number
  average: number
  low: number
  high: number
}

export interface TradepostHistory {
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
  trades: TradepostTrade[]
  history: Record<TradepostRange, TradepostHistory>
}

export interface TradepostItemData {
  world: number
  item: TradepostItemDetail
}

/** The invite-only beta (rsc-www's src/discord.js). */
export interface BetaAccess {
  enabled: boolean
  loggedIn: boolean
  linked?: boolean
  discordName?: string | null
  inServer?: boolean
  tester?: boolean
  staff?: boolean
  checked?: number | null
}

/** Staff: one account's Discord link. */
export interface BetaTesterLink {
  username: string
  discordId: string
  discordName: string | null
  inServer: boolean
  tester: boolean
  linked: number
  checked: number
}

/** Staff: every account linked to Discord (rsc-www's /api/admin/beta-testers). */
export interface BetaTestersData {
  enabled: boolean
  links: BetaTesterLink[]
  /** Accounts staff accepted on the website, testers without the Discord role. */
  accepted: AcceptedBetaTester[]
}

/** An account staff accepted as a beta tester; `at` is unix milliseconds. */
export interface AcceptedBetaTester {
  username: string
  by: string
  at: number
}

// the account page (rsc-www's /api/account): the account on every world, since
// each world keeps its own character

/** An account's facts on one world. Dates are unix seconds. */
export interface AccountDetails {
  username: string
  rank: number
  /** 0 standard, 1 Ironman. */
  accountMode: number
  questPoints: number
  totalLevel: number
  createdAt: number
  lastLogin: number
  /** 0 not muted, -1 for good, otherwise when it ends. */
  mutedUntil: number
  /** 0 not banned, -1 for good, otherwise when it ends. */
  bannedUntil: number
  /** The world the account is playing on now, 0 when offline. */
  world: number
}

export interface AccountCharacter {
  ranks: Record<string, PlayerRank>
  accountMode: number
  /** Null when not chosen yet; absent on an old API. */
  gameMode?: GameMode | null
  diaries: DiarySummary | null
  appearance: PlayerAppearance | null
}

export interface AccountWorld {
  id: number
  name: string
  channel: string
  botting: boolean
  /** False when the world's data server didn't answer. */
  reachable: boolean
  /** Null on a world without the account, or one too old to tell. */
  account: AccountDetails | null
  /** Null until the character has hiscore entries there. */
  character: AccountCharacter | null
}

/** An account's toplist votes, from World 1's ledger (times in unix seconds, 0 for never). */
export interface VoteSummary {
  total: number
  /** Votes not yet collected with ::claim. */
  waiting: number
  lastVoteAt: number
  nextVoteAt: number
}

export interface AccountPageData {
  username: string
  rank: number
  worlds: AccountWorld[]
  /** null when the vote ledger can't be asked; absent on an old API. */
  votes?: VoteSummary | null
}

export interface PasswordChangeResult {
  success: boolean
  sessionsEnded: number
  /** The other worlds: changed, kept their own password (reason), or unreachable (null). */
  worlds: { id: number; name: string; changed: boolean | null; reason: string | null }[]
}
