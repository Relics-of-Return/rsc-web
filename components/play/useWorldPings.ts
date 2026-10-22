"use client";

import { useEffect, useRef, useState } from "react";

import { measureRoundTrip, worldSocketURL } from "@/lib/ping";
import type { WorldEntry } from "@/lib/types";

export type PingState = number | null | undefined;

export type WorldPings = Record<number, PingState>;

export function useWorldPings(worlds: WorldEntry[]): WorldPings {
  const [pings, setPings] = useState<WorldPings>({});
  const measured = useRef(new Set<number>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      for (const world of worlds) {
        if (cancelled) {
          return;
        }

        if (!world.online || measured.current.has(world.id)) {
          continue;
        }

        const url = worldSocketURL(world);

        if (!url) {
          continue;
        }

        measured.current.add(world.id);

        const ping = await measureRoundTrip(url);

        if (mounted.current) {
          setPings((current) => ({ ...current, [world.id]: ping }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [worlds]);

  return pings;
}
