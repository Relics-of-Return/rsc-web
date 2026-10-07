import type {
  AbuseReportDetail,
  AbuseReportsData,
  AdminBetaData,
  AdminGuideData,
  AdminGuidesData,
  AdminNewsArticleData,
  AdminNewsData,
  BetaAccess,
  BetaData,
  BetaResolution,
  BetaResult,
  GuideRevisionsData,
  LoginResult,
  LogoutResult,
  PlayersData,
  RegisterResult,
  ResolveReportResult,
  ServerStatusData,
  SessionData,
  SiteConfig,
  SiteSettings,
  StaffLogsData,
  WorldsData,
} from '@/lib/types'

/**
 * Client-side fetchers. These hit the Next.js BFF route handlers
 * (app/api/*), which in turn talk to rsc-www server-side.
 */

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-store' })

  if (!res.ok) {
    throw new Error(`request failed (${res.status})`)
  }

  return res.json() as Promise<T>
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`request failed (${res.status})`)
  }

  return res.json() as Promise<T>
}

export async function getServerStatus(): Promise<ServerStatusData> {
  return getJSON<ServerStatusData>('/api/status')
}

export async function getSiteConfig(): Promise<SiteConfig> {
  return getJSON<SiteConfig>('/api/config')
}

export async function getWorlds(): Promise<WorldsData> {
  return getJSON<WorldsData>('/api/worlds')
}

/** Live player coordinates for the world map of one world (default world 1). */
export async function getPlayerPositions(world?: number): Promise<PlayersData> {
  const query = world && world !== 1 ? `?world=${world}` : ''

  return getJSON<PlayersData>(`/api/players${query}`)
}

/** Resolves the current session: { username: string | null }. */
export async function getSession(): Promise<SessionData> {
  return getJSON<SessionData>('/api/session')
}

/** `accountMode` is 0 for a standard account, 1 for an Ironman. */
export async function registerAccount(
  username: string,
  password: string,
  confirm: string,
  accountMode = 0,
): Promise<RegisterResult> {
  return postJSON<RegisterResult>('/api/register', {
    username,
    password,
    confirm,
    accountMode,
  })
}

export async function loginAccount(
  username: string,
  password: string,
): Promise<LoginResult> {
  return postJSON<LoginResult>('/api/login', { username, password })
}

export async function logoutAccount(): Promise<LogoutResult> {
  return postJSON<LogoutResult>('/api/logout', {})
}

/**
 * Error carrying the HTTP status, so the admin section can tell "log in"
 * (401) apart from "you are not staff" (403).
 */
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function adminJSON<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(
    path,
    body === undefined
      ? { cache: 'no-store' }
      : {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        },
  )

  if (!res.ok) {
    throw new ApiError(res.status, `request failed (${res.status})`)
  }

  return res.json() as Promise<T>
}

/**
 * The in-game abuse report queue. Staff only — rsc-www answers 401 when
 * nobody is logged in and 403 when the account is not staff, both of which
 * arrive here as an {@link ApiError}.
 *
 * `handled`: 0 open reports (default), 1 resolved, -1 everything.
 */
export async function getAbuseReports(
  options: { handled?: number; accused?: string; page?: number } = {},
): Promise<AbuseReportsData> {
  const params = new URLSearchParams()

  params.set('handled', String(options.handled ?? 0))

  if (options.accused) params.set('accused', options.accused)
  if (options.page) params.set('page', String(options.page))

  return adminJSON<AbuseReportsData>(`/api/admin/reports?${params}`)
}

/** Marks an abuse report as dealt with, or reopens it. */
export async function resolveAbuseReport(
  id: number,
  handled = true,
): Promise<ResolveReportResult> {
  return adminJSON<ResolveReportResult>('/api/admin/reports/resolve', {
    id,
    handled,
  })
}

/** The full case file for one report: snapshot, account facts and history. */
export async function getAbuseReportDetail(id: number): Promise<AbuseReportDetail> {
  return adminJSON<AbuseReportDetail>(`/api/admin/reports/detail?id=${id}`)
}

/**
 * Changes the site's settings given, leaving the rest, and resolves to all of
 * them. Administrators only: rsc-www answers 401 when nobody is logged in and
 * 403 for anyone below an administrator.
 */
export async function saveSiteSettings(changes: Partial<SiteSettings>): Promise<SiteSettings> {
  return adminJSON<SiteSettings>('/api/admin/settings', changes)
}

export async function getAdminNews(page = 0): Promise<AdminNewsData> {
  return adminJSON<AdminNewsData>(`/api/admin/news?page=${page}`)
}

export async function getAdminNewsArticle(id: number): Promise<AdminNewsArticleData> {
  return adminJSON<AdminNewsArticleData>(`/api/admin/news?id=${id}`)
}

export async function createNewsArticle(article: {
  title: string
  category: number
  date: number
  body: string
}): Promise<{ success: boolean }> {
  return adminJSON<{ success: boolean }>('/api/admin/news', {
    action: 'create',
    ...article,
  })
}

export async function updateNewsArticle(article: {
  id: number
  title: string
  category: number
  date: number
  body: string
}): Promise<{ success: boolean }> {
  return adminJSON<{ success: boolean }>('/api/admin/news', {
    action: 'update',
    ...article,
  })
}

export async function deleteNewsArticle(id: number): Promise<{ success: boolean }> {
  return adminJSON<{ success: boolean }>('/api/admin/news', {
    action: 'delete',
    id,
  })
}

export async function uploadNewsImage(file: File): Promise<{ success: boolean; url: string }> {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      resolve(result.split(',', 2)[1] ?? '')
    }
    reader.onerror = () => reject(reader.error ?? new Error('unable to read image'))
    reader.readAsDataURL(file)
  })

  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  return adminJSON<{ success: boolean; url: string }>('/api/admin/news/image', {
    extension,
    data,
  })
}

export async function getAdminGuides(): Promise<AdminGuidesData> {
  return adminJSON<AdminGuidesData>('/api/admin/guides')
}

export async function getAdminGuide(id: number): Promise<AdminGuideData> {
  return adminJSON<AdminGuideData>(`/api/admin/guides?id=${id}`)
}

/** The last 50 snapshots of one guide, newest first. */
export async function getGuideRevisions(guideId: number): Promise<GuideRevisionsData> {
  return adminJSON<GuideRevisionsData>(`/api/admin/guides?revisions=${guideId}`)
}

export async function createGuideArticle(guide: {
  slug: string
  title: string
  description: string
  category: string
  body: string
}): Promise<{ success: boolean; id?: number }> {
  return adminJSON<{ success: boolean; id?: number }>('/api/admin/guides', {
    action: 'create',
    ...guide,
  })
}

export async function updateGuideArticle(guide: {
  id: number
  slug: string
  title: string
  description: string
  category: string
  body: string
}): Promise<{ success: boolean; id?: number }> {
  return adminJSON<{ success: boolean; id?: number }>('/api/admin/guides', {
    action: 'update',
    ...guide,
  })
}

export async function deleteGuideArticle(id: number): Promise<{ success: boolean }> {
  return adminJSON<{ success: boolean }>('/api/admin/guides', {
    action: 'delete',
    id,
  })
}

/** Copy an old snapshot back over the guide (saved as a new revision). */
export async function restoreGuideRevision(
  revisionId: number,
): Promise<{ success: boolean; id?: number }> {
  return adminJSON<{ success: boolean; id?: number }>('/api/admin/guides', {
    action: 'restore',
    revisionId,
  })
}

export async function uploadGuideImage(file: File): Promise<{ success: boolean; url: string }> {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      resolve(result.split(',', 2)[1] ?? '')
    }
    reader.onerror = () => reject(reader.error ?? new Error('unable to read image'))
    reader.readAsDataURL(file)
  })

  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  return adminJSON<{ success: boolean; url: string }>('/api/admin/guides/image', {
    extension,
    data,
  })
}

/** URL of the screenshot the reporter's client uploaded (staff session needed). */
export function abuseReportScreenshotUrl(id: number): string {
  return `/api/admin/reports/screenshot?id=${id}`
}

/** Filters for the staff command log. Every one is optional. */
export interface StaffLogFilters {
  /** Exact staff member who used a command. */
  staff?: string
  /** Exact player a command was used on. */
  target?: string
  /** A player name: matches commands they used *and* commands used on them. */
  player?: string
  /** Command id (see {@link StaffLogsData.commands}), e.g. 'mute'. */
  command?: string
  source?: 'game' | 'website'
  /** World id; omit or -1 for every world. */
  world?: number
  /** Unix timestamp (seconds), inclusive lower bound. */
  from?: number
  /** Unix timestamp (seconds), inclusive upper bound. */
  to?: number
  page?: number
}

/**
 * The staff command log, newest first. Administrators only — rsc-www answers
 * 401 when nobody is logged in and 403 for anyone below an administrator, both
 * of which arrive here as an {@link ApiError}.
 */
export async function getStaffLogs(
  filters: StaffLogFilters = {},
): Promise<StaffLogsData> {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }

  const query = params.toString()
  return adminJSON<StaffLogsData>(`/api/admin/logs${query ? `?${query}` : ''}`)
}

// -- beta testing --------------------------------------------------------------

/** Like adminJSON, but the error carries rsc-www's own message ("say what went wrong"). */
async function betaJSON<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(
    path,
    body === undefined
      ? { cache: 'no-store' }
      : {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        },
  )
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new ApiError(res.status, (data && data.error) || `request failed (${res.status})`)
  }

  return data as T
}

/** The beta round testers are working on (or the last one), with the player's own answers. */
export async function getBeta(): Promise<BetaData> {
  return betaJSON<BetaData>('/api/beta')
}

/** A logged-in player's answer for one checklist item; "broken" needs a note. */
export async function submitBetaResult(itemId: number, result: BetaResult, note = ''): Promise<BetaData> {
  return betaJSON<BetaData>('/api/beta/result', { itemId, result, note })
}

/** Staff: the round with every answer and who gave it, and the earlier rounds. */
export async function getAdminBeta(): Promise<AdminBetaData> {
  return betaJSON<AdminBetaData>('/api/admin/beta')
}

/** Staff: add an item (no id), change one, or remove one. */
export async function editBetaItem(item: {
  id?: number
  title?: string
  howToTest?: string
  area?: string
  /** null or 0 uses the round's count */
  minWorks?: number | null
  remove?: boolean
}): Promise<BetaData> {
  return betaJSON<BetaData>('/api/admin/beta/item', item)
}

/** Staff: what a broken report turned out to be (null reopens it). */
export async function resolveBetaReport(
  itemId: number,
  resultId: number,
  resolution: BetaResolution | null,
): Promise<BetaData> {
  return betaJSON<BetaData>('/api/admin/beta/resolve', { itemId, resultId, resolution })
}

/** The logged-in player's Discord link and beta access (the invite-only beta). */
export async function getBetaAccess(): Promise<BetaAccess> {
  return betaJSON<BetaAccess>('/api/discord')
}

/** Removes the logged-in player's Discord link, and with it their beta access. */
export async function unlinkDiscord(): Promise<BetaAccess> {
  return betaJSON<BetaAccess>('/api/discord/unlink', {})
}
