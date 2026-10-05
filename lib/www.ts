/**
 * Server-side address of the rsc-www API server.
 * Configured via `RSC_WWW_API_URL` (see .env.example). Only use this from
 * server code (route handlers / server components) — never ship it to the
 * browser.
 */
export function getWwwApiUrl(): string {
  return process.env.RSC_WWW_API_URL ?? 'http://127.0.0.1:8888'
}

/**
 * Headers that tell rsc-www who the visitor is, for its per-IP registration
 * limit and login lockout. In production every request reaches rsc-www from
 * this server (Vercel) through the Cloudflare tunnel, so the address rsc-www
 * sees itself is the same for every visitor. It believes the forwarded one
 * only with the shared secret beside it (`proxySecret` in rsc-www's config,
 * `RSC_WWW_PROXY_SECRET` here); without the secret nothing is sent.
 *
 * The visitor's address is Vercel's `x-real-ip` / `x-forwarded-for`, which
 * Vercel sets itself, overwriting anything the browser sent. The site's DNS
 * record at Cloudflare must be "DNS only" (grey cloud) for that to be the
 * visitor rather than a Cloudflare edge.
 */
export function visitorHeaders(request: Request): Record<string, string> {
  const secret = process.env.RSC_WWW_PROXY_SECRET

  if (!secret) {
    return {}
  }

  const address =
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()

  return address ? { 'x-rsc-client-ip': address, 'x-rsc-proxy-secret': secret } : {}
}

/**
 * Fetches JSON from rsc-www for server components / route handlers.
 * Throws on non-2xx responses or connection failures — callers should
 * try/catch and degrade gracefully.
 */
export async function fetchWwwJson<T>(
  path: string,
  init?: { revalidate?: number | false },
): Promise<T> {
  const res = await fetch(`${getWwwApiUrl()}${path}`, {
    cache: init?.revalidate === undefined ? 'no-store' : undefined,
    next: init?.revalidate !== undefined ? { revalidate: init.revalidate } : undefined,
  })

  if (!res.ok) {
    throw new Error(`rsc-www request failed (${res.status})`)
  }

  return (await res.json()) as T
}
