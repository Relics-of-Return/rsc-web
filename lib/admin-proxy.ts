import { NextResponse, type NextRequest } from 'next/server'

import { wwwFetch } from '@/lib/www'

const unreachable = (headers?: Record<string, string>) =>
  NextResponse.json({ error: 'the website API is unreachable' }, { status: 502, headers })

/** The browser's session cookie, for routes where rsc-www decides who is asking. */
export function cookieOf(request: NextRequest): Record<string, string> {
  const cookie = request.headers.get('cookie')
  return cookie ? { cookie } : {}
}

/** rsc-www's JSON answer passed on as it is, with its status and any Retry-After. */
async function relay(res: Response, headers: Record<string, string> = {}) {
  const data = await res.json().catch(() => null)
  const retryAfter = res.headers.get('retry-after')

  return NextResponse.json(data ?? { error: 'unexpected response' }, {
    status: res.ok && data ? 200 : res.ok ? 502 : res.status,
    headers: retryAfter ? { ...headers, 'Retry-After': retryAfter } : headers,
  })
}

/**
 * Relays a JSON GET to rsc-www. `path` includes the query string; `cors` lets
 * any origin read it (the game client lives on its own origin); `revalidate`
 * shares one answer between visitors for that many seconds.
 */
export async function proxyGet(
  path: string,
  init: { headers?: Record<string, string>; cors?: boolean; revalidate?: number } = {},
) {
  const cors: Record<string, string> = init.cors ? { 'Access-Control-Allow-Origin': '*' } : {}

  try {
    const res = await wwwFetch(path, {
      headers: init.headers,
      ...(init.revalidate ? { next: { revalidate: init.revalidate } } : { cache: 'no-store' }),
    })
    return await relay(res, cors)
  } catch {
    return unreachable(cors)
  }
}

/**
 * Relays a staff-only request to rsc-www. The browser's session cookie is
 * forwarded so rsc-www can check the caller is staff — the routes built on
 * this never decide that themselves, and pass rsc-www's 401/403 straight back
 * through.
 */
export async function proxyAdminGet(request: NextRequest, path: string) {
  return proxyGet(path, { headers: cookieOf(request) })
}

/** Proxy a JSON POST, with the session cookie. */
export async function proxyAdminPost(request: NextRequest, path: string) {
  const body = await request.json().catch(() => ({}))

  try {
    const res = await wwwFetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...cookieOf(request) },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    return await relay(res)
  } catch {
    return unreachable()
  }
}

/**
 * Proxy a file a player produced (a report screenshot). It is only ever
 * passed on as an inert JPEG that is never cached, whatever the upstream says.
 */
export async function proxyAdminImage(request: NextRequest, path: string) {
  let res: Response

  try {
    res = await wwwFetch(path, { headers: cookieOf(request), cache: 'no-store' })
  } catch {
    return unreachable()
  }

  if (!res.ok) {
    return relay(res)
  }

  return new NextResponse(await res.arrayBuffer(), {
    headers: {
      'content-type': 'image/jpeg',
      'content-disposition': 'inline',
      'content-security-policy': "default-src 'none'; sandbox",
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}
