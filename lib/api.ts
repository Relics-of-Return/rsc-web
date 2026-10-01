import type {
  AbuseReportDetail,
  AbuseReportsData,
  AdminNewsArticleData,
  AdminNewsData,
  LoginResult,
  LogoutResult,
  PlayersData,
  RegisterResult,
  ResolveReportResult,
  ServerStatusData,
  SessionData,
  SiteConfig,
  SiteSettings,
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

/** URL of the screenshot the reporter's client uploaded (staff session needed). */
export function abuseReportScreenshotUrl(id: number): string {
  return `/api/admin/reports/screenshot?id=${id}`
}
