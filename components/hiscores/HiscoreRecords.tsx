import Link from "next/link";

import { Crown } from "@/components/players/Crown";
import { IronBadge } from "@/components/players/IronBadge";
import { Pagination } from "@/components/shared/Pagination";
import { SkillIcon } from "@/components/skills/SkillIcon";
import { skillLabel } from "@/data/skills";
import type {
  HiscoreMilestone,
  HiscoreRecord,
  HiscoreRecordsData,
} from "@/lib/types";
import {
  cn,
  formatNumber,
  formatShortDate,
  formatUnixDateTime,
  formatUsername,
} from "@/lib/utils";

export type RecordsProblem = "busy" | "unavailable" | "offline";

export interface RecordsLink {
  milestone?: HiscoreMilestone;
  skill?: string;
  page?: number;
  username?: string;
}

interface HiscoreRecordsProps {
  data: HiscoreRecordsData | null;
  problem: RecordsProblem | null;
  milestone: HiscoreMilestone;
  skill: string;
  page: number;
  skills: string[];
  href: (link: RecordsLink) => string;
}

const MILESTONES: { id: HiscoreMilestone; label: string; reached: string }[] = [
  { id: "99", label: "Level 99", reached: "99" },
  { id: "200m", label: "200M experience", reached: "200M experience" },
];

const PROBLEMS: Record<RecordsProblem, string> = {
  busy: "Too many requests from your address. Try again in a minute.",
  unavailable: "This world's records aren't available yet.",
  offline: "Unable to load the records. The game server may be offline.",
};

const chip = (active: boolean) =>
  cn(
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium uppercase tracking-wide border transition-colors",
    active
      ? "border-gold-500/60 bg-gold-500/10 text-gold-400"
      : "border-stone-700 text-text-secondary hover:border-gold-500/40 hover:text-gold-400",
  );

const headCell =
  "px-4 py-3 font-adventure uppercase tracking-wide text-gold-400";

function PlayerLink({
  record,
  href,
}: {
  record: HiscoreRecord;
  href: HiscoreRecordsProps["href"];
}) {
  return (
    <Link
      href={href({ username: record.username })}
      className="inline-flex items-center gap-1.5 text-text-primary hover:text-gold-400 transition-colors"
    >
      <Crown rank={record.staffRank} />
      <IronBadge accountMode={record.accountMode} temper={record.temper} />
      {formatUsername(record.username)}
    </Link>
  );
}

export function HiscoreRecords({
  data,
  problem,
  milestone,
  skill,
  page,
  skills,
  href,
}: HiscoreRecordsProps) {
  const current =
    MILESTONES.find(({ id }) => id === milestone) ?? MILESTONES[0];
  const firsts = new Map(
    (data?.firsts ?? []).map((record) => [record.skill, record]),
  );
  const counts = data?.counts ?? null;

  return (
    <div className="mt-10">
      <div className="flex flex-wrap justify-center gap-2">
        {MILESTONES.map(({ id, label }) => (
          <Link
            key={id}
            href={href({ milestone: id, skill: "", page: 0 })}
            aria-current={id === milestone ? "page" : undefined}
            className={chip(id === milestone)}
          >
            {label}
          </Link>
        ))}
      </div>

      {problem || !data ? (
        <p className="mt-12 text-center text-text-secondary">
          {PROBLEMS[problem ?? "offline"]}
        </p>
      ) : (
        <>
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <section aria-labelledby="records-firsts">
              <h2
                id="records-firsts"
                className="font-adventure text-xl text-text-primary"
              >
                First to {current.reached}
              </h2>
              <div className="mt-4 overflow-x-auto rounded-lg border border-stone-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-700 bg-stone-800/80">
                      <th className={cn(headCell, "text-left")}>Skill</th>
                      <th className={cn(headCell, "text-left")}>Player</th>
                      <th className={cn(headCell, "text-right")}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skills.map((entry) => {
                      const record = firsts.get(entry);

                      return (
                        <tr
                          key={entry}
                          className="border-b border-stone-800 last:border-0"
                        >
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-2 text-text-primary">
                              <SkillIcon skill={entry} className="w-5 h-5" />
                              {skillLabel(entry)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {record ? (
                              <PlayerLink record={record} href={href} />
                            ) : (
                              <span className="text-text-muted whitespace-nowrap">
                                Not yet reached
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right text-text-secondary whitespace-nowrap">
                            {record ? formatShortDate(record.date) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-labelledby="records-counts">
              <h2
                id="records-counts"
                className="font-adventure text-xl text-text-primary"
              >
                Players with {current.reached}
              </h2>
              {counts ? (
                <div className="mt-4 overflow-x-auto rounded-lg border border-stone-700">
                  <table className="w-full text-sm">
                    <caption className="caption-bottom px-4 py-2.5 text-left text-xs text-text-muted">
                      Counted hourly from every player&apos;s experience, as of{" "}
                      {formatUnixDateTime(data.countedAt)}.
                    </caption>
                    <thead>
                      <tr className="border-b border-stone-700 bg-stone-800/80">
                        <th className={cn(headCell, "text-left")}>Skill</th>
                        <th className={cn(headCell, "text-right")}>Players</th>
                        <th className={cn(headCell, "text-right")}>Ironmen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {skills.map((entry) => (
                        <tr key={entry} className="border-b border-stone-800">
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-2 text-text-primary">
                              <SkillIcon skill={entry} className="w-5 h-5" />
                              {skillLabel(entry)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-gold-400">
                            {formatNumber(counts[entry]?.all)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-text-secondary">
                            {formatNumber(counts[entry]?.ironman)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-stone-800/60">
                        <td className="px-4 py-2.5 font-semibold text-text-primary">
                          Every skill
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gold-400">
                          {formatNumber(counts.every?.all)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-text-secondary">
                          {formatNumber(counts.every?.ironman)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-text-secondary">
                  The counts are taken hourly; the first is on its way.
                </p>
              )}
            </section>
          </div>

          <section aria-labelledby="records-reached" className="mt-12">
            <h2
              id="records-reached"
              className="font-adventure text-xl text-text-primary"
            >
              Reached {current.reached}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Newest first, since the records began.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={href({ skill: "", page: 0 })}
                className={chip(skill === "")}
              >
                All skills
              </Link>
              {skills.map((entry) => (
                <Link
                  key={entry}
                  href={href({ skill: entry, page: 0 })}
                  className={chip(entry === skill)}
                >
                  <SkillIcon skill={entry} className="w-4 h-4" />
                  {skillLabel(entry)}
                </Link>
              ))}
            </div>

            {data.entries.length === 0 ? (
              <p className="mt-8 text-center text-text-secondary">
                No one has reached {current.reached}
                {skill ? ` in ${skillLabel(skill)}` : ""} on this world yet.
              </p>
            ) : (
              <>
                <div className="mt-6 overflow-x-auto rounded-lg border border-stone-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-700 bg-stone-800/80">
                        <th className={cn(headCell, "text-left")}>Date</th>
                        <th className={cn(headCell, "text-left")}>Player</th>
                        <th className={cn(headCell, "text-left")}>Skill</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.entries.map((record) => (
                        <tr
                          key={`${record.username}:${record.skill}`}
                          className="border-b border-stone-800 last:border-0 hover:bg-stone-800/50 transition-colors"
                        >
                          <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap">
                            {formatShortDate(record.date)}
                          </td>
                          <td className="px-4 py-2.5">
                            <PlayerLink record={record} href={href} />
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-2 text-text-primary">
                              <SkillIcon
                                skill={record.skill}
                                className="w-5 h-5"
                              />
                              {skillLabel(record.skill)}
                            </span>
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
          </section>
        </>
      )}
    </div>
  );
}
