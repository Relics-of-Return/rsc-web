import { cn } from "@/lib/utils";

import type { PingState } from "./useWorldPings";

function pingColour(ping: number): string {
  if (ping < 100) {
    return "text-moss";
  }

  return ping < 200 ? "text-gold-400" : "text-ember";
}

export function PingValue({ ping }: { ping: PingState }) {
  if (ping === undefined) {
    return (
      <span className="text-text-muted" title="Measuring the round trip…">
        …
      </span>
    );
  }

  if (ping === null) {
    return (
      <span
        className="text-text-muted"
        title="This world did not answer from this browser"
      >
        —
      </span>
    );
  }

  return (
    <span
      className={cn("tabular-nums", pingColour(ping))}
      title="Round trip from this browser through the game's own connection path"
    >
      {ping} ms
    </span>
  );
}
