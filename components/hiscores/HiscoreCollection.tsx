import Link from "next/link";

import { Crown } from "@/components/players/Crown";
import { IronBadge } from "@/components/players/IronBadge";
import { Pagination } from "@/components/shared/Pagination";
import type { CollectionLogRank, HiscoreCollectionData } from "@/lib/types";
import {
  cn,
  formatNumber,
  formatUnixDateTime,
  formatUsername,
} from "@/lib/utils";

export type CollectionProblem = "busy" | "unavailable" | "offline";

export interface CollectionLink {
  page?: number;
  username?: string;
}

interface HiscoreCollectionProps {
  data: HiscoreCollectionData | null;
  problem: CollectionProblem | null;
  page: number;
  href: (link: CollectionLink) => string;
}

const PROBLEMS: Record<CollectionProblem, string> = {
  busy: "Too many requests from your address. Try again in a minute.",
  unavailable: "This world's collection log isn't available yet.",
  offline: "Unable to load the collection log. The game server may be offline.",
};

const headCell =
  "px-4 py-3 font-adventure uppercase tracking-wide text-gold-400";

function PlayerLink({
  entry,
  href,
}: {
  entry: CollectionLogRank;
  href: HiscoreCollectionProps["href"];
}) {
  return (
    <Link
      href={href({ username: entry.username })}
      className="inline-flex items-center gap-1.5 text-text-primary hover:text-gold-400 transition-colors"
    >
      <Crown rank={entry.staffRank} />
      <IronBadge accountMode={entry.accountMode} temper={entry.temper} />
      {formatUsername(entry.username)}
    </Link>
  );
}

export function HiscoreCollection({
  data,
  problem,
  page,
  href,
}: HiscoreCollectionProps) {
  const empty = !data
    ? ""
    : data.countedAt
      ? "No one has anything logged yet — be the first!"
      : "This world's collection log hasn't been ranked yet.";

  return (
    <div className="mt-10">
      {problem || !data ? (
        <p className="mt-12 text-center text-text-secondary">
          {PROBLEMS[problem ?? "offline"]}
        </p>
      ) : (
        <>
          <p className="text-center text-sm text-text-secondary">
            {formatNumber(data.totalEntries)} entries across{" "}
            {formatNumber(data.totalSources)} sources to collect. Ranked hourly
            from every player&apos;s log.
          </p>

          {data.rows.length === 0 ? (
            <p className="mt-12 text-center text-text-secondary">{empty}</p>
          ) : (
            <>
              <div className="mt-6 overflow-x-auto rounded-lg border border-stone-700">
                <table className="w-full text-sm">
                  <caption className="caption-bottom px-4 py-2.5 text-left text-xs text-text-muted">
                    As of {formatUnixDateTime(data.countedAt)} ·{" "}
                    {formatNumber(data.total)}{" "}
                    {data.total === 1 ? "player" : "players"} with something
                    logged.
                  </caption>
                  <thead>
                    <tr className="border-b border-stone-700 bg-stone-800/80">
                      <th className={cn(headCell, "text-left")}>Rank</th>
                      <th className={cn(headCell, "text-left")}>Username</th>
                      <th className={cn(headCell, "text-right")}>
                        Completions
                      </th>
                      <th className={cn(headCell, "text-right")}>
                        Collections
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((entry) => (
                      <tr
                        key={entry.username}
                        className="border-b border-stone-800 last:border-0 hover:bg-stone-800/50 transition-colors"
                      >
                        <td className="px-4 py-2.5 text-text-muted">
                          {formatNumber(entry.rank)}
                        </td>
                        <td className="px-4 py-2.5">
                          <PlayerLink entry={entry} href={href} />
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-gold-400">
                          {formatNumber(entry.completions)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-text-secondary">
                          {formatNumber(entry.collections)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={page}
                totalPages={data.pages}
                buildHref={(p) => href({ page: p })}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
