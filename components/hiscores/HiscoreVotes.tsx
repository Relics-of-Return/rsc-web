import Link from "next/link";

import { Crown } from "@/components/players/Crown";
import { GameModeBadges } from "@/components/players/GameModeBadges";
import { IronBadge } from "@/components/players/IronBadge";
import { Pagination } from "@/components/shared/Pagination";
import type { HiscoreVotesData, VotePeriod, VoteRank } from "@/lib/types";
import { cn, formatNumber, formatShortDate, formatUsername } from "@/lib/utils";

export type VotesProblem = "busy" | "unavailable" | "offline";

export interface VotesLink {
  period?: VotePeriod;
  page?: number;
  username?: string;
}

interface HiscoreVotesProps {
  data: HiscoreVotesData | null;
  problem: VotesProblem | null;
  period: VotePeriod;
  page: number;
  href: (link: VotesLink) => string;
}

const PROBLEMS: Record<VotesProblem, string> = {
  busy: "Too many requests from your address. Try again in a minute.",
  unavailable: "The vote hiscores aren't available yet.",
  offline: "Unable to load the vote hiscores. The game server may be offline.",
};

const PERIODS: { id: VotePeriod; label: string; empty: string }[] = [
  {
    id: "month",
    label: "This month",
    empty: "No one has voted this month yet — be the first!",
  },
  {
    id: "all",
    label: "All time",
    empty: "No one has voted yet — be the first!",
  },
];

const chip = (active: boolean) =>
  cn(
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium uppercase tracking-wide border transition-colors",
    active
      ? "border-gold-500/60 bg-gold-500/10 text-gold-400"
      : "border-stone-700 text-text-secondary hover:border-gold-500/40 hover:text-gold-400",
  );

// 2nd, 1st, 3rd from left to right, the winner's step the tallest
const STEPS = [
  {
    place: 2,
    step: "h-20 sm:h-24 border-zinc-300/60 bg-zinc-300/10 text-zinc-300",
  },
  {
    place: 1,
    step: "h-28 sm:h-36 border-gold-500/70 bg-gold-500/15 text-gold-400",
  },
  {
    place: 3,
    step: "h-14 sm:h-16 border-amber-700/70 bg-amber-700/15 text-amber-600",
  },
];

// the badges at twice their pixel size (as on the player lookup): 1x is too
// small to make out next to a name, and pixel art scaled by anything but a
// whole multiple loses its one-pixel highlights
function Badges({ entry }: { entry: VoteRank }) {
  return (
    <>
      <Crown rank={entry.staffRank} className="w-[26px] h-[22px]" />
      <IronBadge
        accountMode={entry.accountMode}
        temper={entry.temper}
        className="w-[20px] h-[26px]"
      />
      <GameModeBadges gameMode={entry.gameMode} height={22} />
    </>
  );
}

function Podium({
  rows,
  href,
}: {
  rows: VoteRank[];
  href: HiscoreVotesProps["href"];
}) {
  return (
    <ul
      className="mx-auto mb-10 grid max-w-2xl grid-cols-3 items-end gap-2 sm:gap-4"
      aria-label="Top three voters"
    >
      {STEPS.map(({ place, step }) => {
        const entry = rows[place - 1];

        return (
          <li key={place} className="flex min-w-0 flex-col items-center">
            <span className="sr-only">Place {place}: </span>
            {entry && (
              <>
                <Link
                  href={href({ username: entry.username })}
                  className="inline-flex max-w-full items-center gap-1 text-sm font-medium text-text-primary hover:text-gold-400 transition-colors sm:text-base"
                >
                  <Badges entry={entry} />
                  <span className="truncate">
                    {formatUsername(entry.username)}
                  </span>
                </Link>
                <p className="mb-2 mt-0.5 text-xs text-text-secondary">
                  {formatNumber(entry.votes)}{" "}
                  {entry.votes === 1 ? "vote" : "votes"}
                </p>
              </>
            )}
            <div
              className={cn(
                "flex w-full items-start justify-center rounded-t-md border border-b-0 pt-2 font-adventure text-3xl sm:text-4xl",
                step,
              )}
              aria-hidden="true"
            >
              {place}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const headCell =
  "px-4 py-3 font-adventure uppercase tracking-wide text-gold-400";

export function HiscoreVotes({
  data,
  problem,
  period,
  page,
  href,
}: HiscoreVotesProps) {
  const current = PERIODS.find(({ id }) => id === period) ?? PERIODS[0];

  return (
    <div className="mt-10">
      <nav
        className="mb-8 flex flex-wrap justify-center gap-2"
        aria-label="Vote period"
      >
        {PERIODS.map(({ id, label }) => (
          <Link
            key={id}
            href={href({ period: id, page: 0 })}
            aria-current={id === period ? "page" : undefined}
            className={chip(id === period)}
          >
            {label}
          </Link>
        ))}
      </nav>

      {problem || !data ? (
        <p className="mt-12 text-center text-text-secondary">
          {PROBLEMS[problem ?? "offline"]}
        </p>
      ) : data.rows.length === 0 ? (
        <p className="mt-12 text-center text-text-secondary">{current.empty}</p>
      ) : (
        <>
          {page === 0 && <Podium rows={data.rows} href={href} />}

          <div className="overflow-x-auto rounded-lg border border-stone-700">
            <table className="w-full text-sm">
              <caption className="caption-bottom px-4 py-2.5 text-left text-xs text-text-muted">
                {formatNumber(data.totalVotes)}{" "}
                {data.totalVotes === 1 ? "vote" : "votes"} from{" "}
                {formatNumber(data.total)}{" "}
                {data.total === 1 ? "player" : "players"}
                {data.since
                  ? ` since ${formatShortDate(data.since)} (UTC).`
                  : " in all."}
              </caption>
              <thead>
                <tr className="border-b border-stone-700 bg-stone-800/80">
                  <th className={cn(headCell, "text-left")}>Rank</th>
                  <th className={cn(headCell, "text-left")}>Username</th>
                  <th className={cn(headCell, "text-right")}>
                    {period === "month" ? "Votes this month" : "Votes"}
                  </th>
                  <th className={cn(headCell, "text-right")}>Last vote</th>
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
                      <Link
                        href={href({ username: entry.username })}
                        className="inline-flex items-center gap-1.5 text-sm text-text-primary hover:text-gold-400 transition-colors sm:text-base"
                      >
                        <Badges entry={entry} />
                        {formatUsername(entry.username)}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-gold-400">
                      {formatNumber(entry.votes)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-text-secondary">
                      {entry.lastVoteAt
                        ? formatShortDate(entry.lastVoteAt)
                        : "—"}
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
    </div>
  );
}
