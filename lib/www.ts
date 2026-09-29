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
