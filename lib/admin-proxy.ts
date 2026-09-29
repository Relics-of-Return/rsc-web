import { NextResponse, type NextRequest } from 'next/server'

import { getWwwApiUrl } from '@/lib/www'

/**
 * Relays a staff-only request to rsc-www. The browser's session cookie is
 * forwarded so rsc-www can check the caller is staff — the routes built on
 * this never decide that themselves, and pass rsc-www's 401/403 straight back
 * through.
 */
async function forward(
  request: NextRequest,
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown },
): Promise<Response | null> {
  const cookie = request.headers.get('cookie') ?? ''

  try {
    return await fetch(`${getWwwApiUrl()}${path}`, {
      method: init.method,
      headers: {
        ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(cookie ? { cookie } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
    })
  } catch {
    return null
  }
}

const unreachable = () =>
  NextResponse.json({ error: 'the website API is unreachable' }, { status: 502 })

/** Proxy a JSON GET. `path` includes the query string. */
export async function proxyAdminGet(request: NextRequest, path: string) {
  const res = await forward(request, path, { method: 'GET' })

  if (!res) return unreachable()

  const data = await res.json().catch(() => null)

  return NextResponse.json(data ?? { error: 'unexpected response' }, {
    status: res.ok && data ? 200 : res.ok ? 502 : res.status,
  })
}

/** Proxy a JSON POST. */
export async function proxyAdminPost(request: NextRequest, path: string) {
  const body = await request.json().catch(() => ({}))
  const res = await forward(request, path, { method: 'POST', body })

  if (!res) return unreachable()

  const data = await res.json().catch(() => null)

  return NextResponse.json(data ?? { error: 'unexpected response' }, {
    status: res.ok && data ? 200 : res.ok ? 502 : res.status,
  })
}

/**
 * Proxy a file a player produced (a report screenshot). It is only ever
 * passed on as an inert JPEG that is never cached, whatever the upstream says.
 */
export async function proxyAdminImage(request: NextRequest, path: string) {
  const res = await forward(request, path, { method: 'GET' })

  if (!res) return unreachable()

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    return NextResponse.json(data ?? { error: 'unexpected response' }, { status: res.status })
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
