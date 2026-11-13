import { headers } from "next/headers";

export function getWwwApiUrl(): string {
  return process.env.RSC_WWW_API_URL ?? "http://127.0.0.1:8888";
}

/** How long a request to rsc-www may take before the page gives up on it. */
const WWW_TIMEOUT_MS = 10_000;

/**
 * fetch() against rsc-www. Every page's layout waits on rsc-www, so a request
 * that never answers is given up on rather than holding the whole site. A
 * timer rather than an AbortSignal: a signal turns off Next's de-duplication
 * of the same fetch within one render (generateMetadata and the page).
 */
export async function wwwFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new WwwError(504)), WWW_TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      fetch(`${getWwwApiUrl()}${path}`, init),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function visitorHeaders(request: Request): Record<string, string> {
  return forwardedVisitor(request.headers);
}

/**
 * The visitor's cookies too, for the hiscores: rsc-www shows private worlds
 * only to the logged-in user the cookie belongs to. Nothing else forwards it.
 */
export function hiscoreHeaders(request: Request): Record<string, string> {
  return withCookie(visitorHeaders(request), request.headers);
}

/** {@link hiscoreHeaders} for a server component, which has no Request. */
export async function pageHiscoreHeaders(): Promise<Record<string, string>> {
  const incoming = await headers();

  return withCookie(forwardedVisitor(incoming), incoming);
}

function withCookie(
  base: Record<string, string>,
  incoming: Headers,
): Record<string, string> {
  const cookie = incoming.get("cookie");

  return cookie ? { ...base, cookie } : base;
}

function forwardedVisitor(incoming: Headers): Record<string, string> {
  const secret = process.env.RSC_WWW_PROXY_SECRET;

  if (!secret) {
    return {};
  }

  const address =
    incoming.get("x-real-ip")?.trim() ||
    incoming.get("x-forwarded-for")?.split(",")[0]?.trim();

  return address
    ? { "x-rsc-client-ip": address, "x-rsc-proxy-secret": secret }
    : {};
}

export class WwwError extends Error {
  constructor(readonly status: number) {
    super(`rsc-www request failed (${status})`);
  }
}

export async function fetchWwwJson<T>(
  path: string,
  init?: { revalidate?: number | false; headers?: Record<string, string> },
): Promise<T> {
  const res = await wwwFetch(path, {
    cache: init?.revalidate === undefined ? "no-store" : undefined,
    next:
      init?.revalidate !== undefined
        ? { revalidate: init.revalidate }
        : undefined,
    headers: init?.headers,
  });

  if (!res.ok) {
    throw new WwwError(res.status);
  }

  return (await res.json()) as T;
}
