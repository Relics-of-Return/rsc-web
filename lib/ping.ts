import type { WorldEntry } from "./types";

export const PING_TIMEOUT = 5000;

const SOCKET_URL = /^wss?:\/\//i;
const HOSTNAME = /^[A-Za-z0-9.-]+$/;

interface LaunchEndpoint {
  host: string;
  port: number;
}

export function launchEndpoint(
  clientURL?: string | null,
): LaunchEndpoint | null {
  if (!clientURL) {
    return null;
  }

  const hash = clientURL.includes("#")
    ? clientURL.slice(clientURL.indexOf("#") + 1)
    : "";

  const [, host = "", port = ""] = hash.split(",");
  const number = Number(port);

  if (
    !host ||
    !HOSTNAME.test(host) ||
    !Number.isInteger(number) ||
    number <= 0 ||
    number > 65535
  ) {
    return null;
  }

  return { host, port: number };
}

export function worldSocketURL(
  world: WorldEntry,
  pageProtocol = typeof window === "undefined"
    ? "https:"
    : window.location.protocol,
): string | null {
  const direct = String(world.websocketURL ?? "").trim();

  if (SOCKET_URL.test(direct)) {
    return direct;
  }

  const endpoint = launchEndpoint(world.clientURL);

  if (!endpoint) {
    return null;
  }

  return `${pageProtocol === "https:" ? "wss" : "ws"}://${endpoint.host}:${endpoint.port}`;
}

function httpURL(socketURL: string): URL | null {
  try {
    const url = new URL(socketURL);

    if (url.protocol === "ws:") {
      url.protocol = "http:";
    } else if (url.protocol === "wss:") {
      url.protocol = "https:";
    } else {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

interface MeasureOptions {
  timeout?: number;
  now?: () => number;
  fetchImpl?: typeof fetch;
}

async function timedFetch(
  fetchImpl: typeof fetch,
  url: string,
  timeout: number,
  now: () => number,
): Promise<number> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const started = now();

  try {
    await fetchImpl(url, {
      mode: "no-cors",
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
    });

    return now() - started;
  } finally {
    clearTimeout(timer);
  }
}

export async function measureRoundTrip(
  socketURL: string,
  {
    timeout = PING_TIMEOUT,
    now = () => performance.now(),
    fetchImpl = typeof fetch === "undefined" ? undefined : fetch,
  }: MeasureOptions = {},
): Promise<number | null> {
  if (!fetchImpl) {
    return null;
  }

  const base = httpURL(socketURL);

  if (!base) {
    return null;
  }

  const probe = (nonce: number): string => {
    const url = new URL(base);
    url.searchParams.set("ping", String(nonce));

    return url.toString();
  };

  try {
    await timedFetch(fetchImpl, probe(Date.now()), timeout, now);
    const elapsed = await timedFetch(
      fetchImpl,
      probe(Date.now() + 1),
      timeout,
      now,
    );

    return Math.round(elapsed);
  } catch {
    return null;
  }
}
