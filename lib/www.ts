import { headers } from "next/headers";

export function getWwwApiUrl(): string {
  return process.env.RSC_WWW_API_URL ?? "http://127.0.0.1:8888";
}

export function visitorHeaders(request: Request): Record<string, string> {
  return forwardedVisitor(request.headers);
}

/** {@link visitorHeaders} for a server component, which has no Request. */
export async function pageVisitorHeaders(): Promise<Record<string, string>> {
  return forwardedVisitor(await headers());
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
  const res = await fetch(`${getWwwApiUrl()}${path}`, {
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
