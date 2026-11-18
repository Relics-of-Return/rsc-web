import Link from "next/link";

import { CollectionLogCard } from "@/components/hiscores/CollectionLogCard";
import { VotesCard } from "@/components/hiscores/VotesCard";
import { HiscoreCollection } from "@/components/hiscores/HiscoreCollection";
import { HiscoreVotes } from "@/components/hiscores/HiscoreVotes";
import {
  HiscoreRecords,
  type RecordsLink,
  type RecordsProblem,
} from "@/components/hiscores/HiscoreRecords";
import { HiscoresIcons } from "@/components/hiscores/HiscoresIcons";
import { PlayerAvatar } from "@/components/players/Avatar";
import { Crown } from "@/components/players/Crown";
import { DiaryCard } from "@/components/players/DiaryCard";
import { GameModeBadges } from "@/components/players/GameModeBadges";
import { IronBadge } from "@/components/players/IronBadge";
import { Pagination } from "@/components/shared/Pagination";
import { SkillIcon } from "@/components/skills/SkillIcon";
import { WorldSwitch } from "@/components/tradepost/WorldSwitch";
import { Container } from "@/components/ui/Container";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { hiscoreModeOf, type HiscoreModeId } from "@/data/game-modes";
import { HISCORE_SKILLS, experienceForLevel, skillLabel } from "@/data/skills";
import { parseWorld } from "@/lib/tradepost";
import type {
  HiscoreCollectionData,
  HiscoreMilestone,
  HiscoreRecordsData,
  HiscoreVotesData,
  VotePeriod,
  HiscoresData,
  PlayerRank,
  PlayerRanksData,
  WorldEntry,
  WorldsData,
} from "@/lib/types";
import { cn, formatNumber, formatShortDate, formatUsername } from "@/lib/utils";
import { WwwError, fetchWwwJson, pageHiscoreHeaders } from "@/lib/www";

export const dynamic = "force-dynamic";

const RANKS_PER_PAGE = 16;

type Tab = "skills" | "records" | "collection" | "votes";

interface HiscoresPageProps {
  searchParams: Promise<{
    skill?: string;
    page?: string;
    username?: string;
    mode?: string;
    world?: string;
    tab?: string;
    milestone?: string;
    period?: string;
  }>;
}

const MODES: { id: HiscoreModeId; label: string; tier?: number }[] = [
  { id: "normal", label: "Normal", tier: 0 },
  { id: "hard", label: "Hard", tier: 1 },
  { id: "extreme", label: "Extreme", tier: 2 },
  { id: "realism", label: "Realism", tier: 3 },
  { id: "ironman", label: "Ironman" },
];

const modeLabel = (id: HiscoreModeId) =>
  MODES.find((m) => m.id === id)?.label ?? "";

const TABS = [
  { id: "skills", label: "Skills" },
  { id: "records", label: "Records" },
  { id: "collection", label: "Collection log" },
  { id: "votes", label: "Votes" },
] as const;

const RECORD_SKILLS = HISCORE_SKILLS.filter((skill) => skill !== "overall");

interface HiscoresLink extends RecordsLink {
  period?: VotePeriod;
  tab?: Tab;
  mode?: string;
  world?: number;
}

export async function generateMetadata({ searchParams }: HiscoresPageProps) {
  const { skill, username, mode, tab } = await searchParams;

  if (username) {
    return { title: `${formatUsername(username)} - Hiscores` };
  }

  if (tab === "records") {
    return { title: "Hiscore Records" };
  }

  if (tab === "collection") {
    return { title: "Collection Log Hiscores" };
  }

  if (tab === "votes") {
    return { title: "Vote Hiscores" };
  }

  return {
    title: `${modeLabel(hiscoreModeOf(mode))} ${skillLabel(skill ?? "overall")} Hiscores`,
  };
}

async function getHiscoreWorlds(
  visitor: Record<string, string>,
): Promise<WorldEntry[]> {
  try {
    const { worlds } = await fetchWwwJson<WorldsData>("/api/hiscores/worlds", {
      headers: visitor,
    });
    return worlds ?? [];
  } catch {
    return [];
  }
}

function problemOf(error: unknown): RecordsProblem {
  if (error instanceof WwwError && error.status === 429) return "busy";
  if (
    error instanceof WwwError &&
    (error.status === 503 || error.status === 404)
  )
    return "unavailable";
  return "offline";
}

export default async function HiscoresPage({
  searchParams,
}: HiscoresPageProps) {
  const {
    skill: rawSkill,
    page: rawPage,
    username,
    mode: rawMode,
    world: rawWorld,
    tab: rawTab,
    milestone: rawMilestone,
    period: rawPeriod,
  } = await searchParams;

  const world = parseWorld(rawWorld);
  const tab: Tab =
    rawTab === "records" || rawTab === "collection" || rawTab === "votes"
      ? rawTab
      : "skills";
  const page = Math.max(0, Number.parseInt(rawPage ?? "0", 10) || 0);
  const mode = hiscoreModeOf(rawMode);
  const milestone: HiscoreMilestone = rawMilestone === "200m" ? "200m" : "99";
  const period: VotePeriod = rawPeriod === "all" ? "all" : "month";
  const skill =
    rawSkill && HISCORE_SKILLS.includes(rawSkill) ? rawSkill : "overall";
  const recordSkill =
    rawSkill && RECORD_SKILLS.includes(rawSkill) ? rawSkill : "";

  const buildHref = (params: HiscoresLink) => {
    const sp = new URLSearchParams();
    const w = params.world ?? world;

    if (w !== 1) sp.set("world", String(w));

    if (params.username) {
      sp.set("username", params.username);
      return `/hiscores?${sp}`;
    }

    const t = params.tab ?? tab;

    if (t === "records") {
      sp.set("tab", "records");
      const ms = params.milestone ?? milestone;
      if (ms !== "99") sp.set("milestone", ms);
      const s = params.skill ?? recordSkill;
      if (s) sp.set("skill", s);
    } else if (t === "collection") {
      sp.set("tab", t);
    } else if (t === "votes") {
      sp.set("tab", t);
      if ((params.period ?? period) === "all") sp.set("period", "all");
    } else {
      const m = params.mode ?? mode;
      if (m !== "normal") sp.set("mode", m);
      const s = params.skill ?? skill;
      if (s !== "overall") sp.set("skill", s);
    }

    const p = params.page ?? page;
    if (p > 0) sp.set("page", String(p));

    const qs = sp.toString();
    return qs ? `/hiscores?${qs}` : "/hiscores";
  };

  const visitor = await pageHiscoreHeaders();
  // started now and awaited after each tab's own request, so the two run together
  const worldsPromise = getHiscoreWorlds(visitor);
  const worldQuery = world === 1 ? "" : `&world=${world}`;

  const worldSwitch = (worlds: WorldEntry[]) => (
    <WorldSwitch
      worlds={worlds}
      world={world}
      path="/hiscores"
      hrefFor={(id) =>
        buildHref({ world: id, page: 0, ...(username ? { username } : {}) })
      }
    />
  );

  if (username) {
    let ranks: PlayerRanksData["ranks"] = null;
    let staffRank = 0;
    let accountMode = 0;
    let diaries: PlayerRanksData["diaries"] = null;
    let milestones: PlayerRanksData["milestones"] = null;
    let collection: PlayerRanksData["collection"] = null;
    let votes: PlayerRanksData["votes"] = null;
    let appearance: PlayerRanksData["appearance"] = null;
    let gameMode: PlayerRanksData["gameMode"];
    let problem: RecordsProblem | null = null;

    try {
      const data = await fetchWwwJson<PlayerRanksData>(
        `/api/hiscores/player?username=${encodeURIComponent(username)}${worldQuery}`,
        { headers: visitor },
      );
      ranks = data.ranks;
      staffRank = data.staffRank ?? 0;
      accountMode = data.accountMode ?? 0;
      diaries = data.diaries ?? null;
      milestones = data.milestones ?? null;
      collection = data.collection ?? null;
      votes = data.votes ?? null;
      appearance = data.appearance ?? null;
      gameMode = data.gameMode;
    } catch (error) {
      problem = problemOf(error);
    }

    const worlds = await worldsPromise;
    const rankEntries: [string, PlayerRank][] | null = ranks
      ? [
          ...HISCORE_SKILLS.map((entry): [string, PlayerRank] => [
            entry,
            (ranks as Record<string, PlayerRank>)[entry] ??
              (entry === "hits"
                ? { rank: 0, level: 10, experience: experienceForLevel(10) }
                : { rank: 0, level: 1, experience: 0 }),
          ]),
          ...Object.entries(ranks as Record<string, PlayerRank>).filter(
            ([entry]) => !HISCORE_SKILLS.includes(entry),
          ),
        ]
      : null;

    return (
      <Container className="py-16">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={buildHref({ username: undefined })}
            className="text-sm text-text-secondary hover:text-gold-400 transition-colors"
          >
            &laquo; Back to hiscores
          </Link>
          {worldSwitch(worlds)}
        </div>

        <SectionTitle
          eyebrow="Player Lookup"
          title={
            <span className="inline-flex items-center gap-2">
              <Crown rank={staffRank} className="w-[26px] h-[22px]" />
              <IronBadge
                accountMode={accountMode}
                temper={diaries?.temper}
                className="w-[20px] h-[26px]"
              />
              <GameModeBadges gameMode={gameMode} height={22} />
              {formatUsername(username)}
            </span>
          }
          align="left"
        />

        {problem === "busy" ? (
          <p className="mt-10 text-center text-text-secondary">
            Too many lookups from your address. Try again in a minute.
          </p>
        ) : problem ? (
          <p className="mt-10 text-center text-text-secondary">
            Unable to load player ranks. The game server may be offline.
          </p>
        ) : !rankEntries ? (
          <p className="mt-10 text-center text-text-secondary">
            No player with that name was found.
          </p>
        ) : (
          <div className="mt-8 flex flex-col lg:flex-row gap-8 lg:gap-12">
            <div className="flex-shrink-0 space-y-6 lg:w-72">
              <PlayerAvatar
                appearance={appearance}
                className="w-full rounded-lg"
              />
              <DiaryCard diaries={diaries} accountMode={accountMode} />
              <CollectionLogCard collection={collection} />
              <VotesCard votes={votes} />
            </div>

            <div className="flex-1 min-w-0 overflow-x-auto rounded-lg border border-stone-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-700 bg-stone-800/80">
                    <th className="px-4 py-3 text-left font-adventure uppercase tracking-wide text-gold-400">
                      Skill
                    </th>
                    <th className="px-4 py-3 text-right font-adventure uppercase tracking-wide text-gold-400">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-right font-adventure uppercase tracking-wide text-gold-400">
                      Level
                    </th>
                    <th className="px-4 py-3 text-right font-adventure uppercase tracking-wide text-gold-400">
                      Experience
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rankEntries.map(([skillKey, rank]) => {
                    const reached = milestones?.[skillKey];

                    return (
                      <tr
                        key={skillKey}
                        className="border-b border-stone-800 last:border-0 hover:bg-stone-800/50 transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <Link
                            href={buildHref({
                              tab: "skills",
                              skill: skillKey,
                              page: 0,
                              username: undefined,
                            })}
                            className="inline-flex items-center gap-2 text-text-primary hover:text-gold-400 transition-colors"
                          >
                            <SkillIcon skill={skillKey} className="w-5 h-5" />
                            {skillLabel(skillKey)}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-right text-text-secondary">
                          {rank.rank > 0 ? formatNumber(rank.rank) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-gold-400">
                          {formatNumber(rank.level)}
                          {reached?.["99"] ? (
                            <span className="ml-1.5 text-xs font-normal text-text-muted">
                              ({formatShortDate(reached["99"])})
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 text-right text-text-secondary">
                          {formatNumber(rank.experience)}
                          {reached?.["200m"] ? (
                            <span className="ml-1.5 text-xs text-text-muted">
                              ({formatShortDate(reached["200m"])})
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Container>
    );
  }

  const worldName = (worlds: WorldEntry[]) =>
    worlds.length > 1 ? worlds.find(({ id }) => id === world)?.name : undefined;

  const header = (worlds: WorldEntry[]) => (
    <>
      <div className="mt-8 flex justify-center">{worldSwitch(worlds)}</div>

      <nav
        className="mt-8 grid grid-cols-2 sm:grid-cols-4 overflow-hidden rounded-lg border border-stone-700 bg-stone-900/60"
        aria-label="Hiscores"
      >
        {TABS.map(({ id, label }) => (
          <Link
            key={id}
            href={buildHref({
              tab: id,
              skill: id === "skills" ? "overall" : "",
              page: 0,
            })}
            aria-current={id === tab ? "page" : undefined}
            className={cn(
              "inline-flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-center font-adventure text-sm uppercase tracking-wide transition-colors sm:flex-row sm:gap-2 sm:px-4 sm:py-3 sm:text-lg",
              id === tab
                ? "bg-stone-800 text-gold-400"
                : "text-text-secondary hover:bg-stone-800/50 hover:text-gold-400",
            )}
          >
            <HiscoresIcons tab={id} className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );

  if (tab === "records") {
    let records: HiscoreRecordsData | null = null;
    let problem: RecordsProblem | null = null;

    try {
      const query = new URLSearchParams({ milestone, page: String(page) });
      if (recordSkill) query.set("skill", recordSkill);
      if (world !== 1) query.set("world", String(world));

      records = await fetchWwwJson<HiscoreRecordsData>(
        `/api/hiscores/records?${query}`,
        {
          headers: visitor,
        },
      );
    } catch (error) {
      problem = problemOf(error);
    }

    const worlds = await worldsPromise;

    return (
      <Container className="py-16">
        <SectionTitle
          eyebrow={worldName(worlds) ?? "Records"}
          title="Records"
          description=""
        />

        {header(worlds)}

        <HiscoreRecords
          data={records}
          problem={problem}
          milestone={milestone}
          skill={recordSkill}
          page={page}
          skills={RECORD_SKILLS}
          href={(link) => buildHref({ tab: "records", ...link })}
        />
      </Container>
    );
  }

  if (tab === "collection") {
    let collection: HiscoreCollectionData | null = null;
    let problem: RecordsProblem | null = null;

    try {
      const query = new URLSearchParams({ page: String(page) });
      if (world !== 1) query.set("world", String(world));

      collection = await fetchWwwJson<HiscoreCollectionData>(
        `/api/hiscores/collection?${query}`,
        { headers: visitor },
      );
    } catch (error) {
      problem = problemOf(error);
    }

    const worlds = await worldsPromise;

    return (
      <Container className="py-16">
        <SectionTitle
          eyebrow={worldName(worlds) ?? "Leaderboard"}
          title="Collection Log"
          description="Every item worth collecting, and how much of the log each player has found."
        />

        {header(worlds)}

        <HiscoreCollection
          data={collection}
          problem={problem}
          page={page}
          href={(link) => buildHref({ tab: "collection", ...link })}
        />
      </Container>
    );
  }

  if (tab === "votes") {
    let votes: HiscoreVotesData | null = null;
    let problem: RecordsProblem | null = null;

    try {
      const query = new URLSearchParams({ page: String(page), period });
      if (world !== 1) query.set("world", String(world));

      votes = await fetchWwwJson<HiscoreVotesData>(
        `/api/hiscores/votes?${query}`,
        { headers: visitor },
      );
    } catch (error) {
      problem = problemOf(error);
    }

    const worlds = await worldsPromise;

    return (
      <Container className="py-16">
        <SectionTitle
          eyebrow="Leaderboard"
          title="Votes"
          description="Every vote cast for Relics of Return on the toplist, counted per account across all worlds."
        />

        {header(worlds)}

        <HiscoreVotes
          data={votes}
          problem={problem}
          period={period}
          page={page}
          href={(link) => buildHref({ tab: "votes", ...link })}
        />
      </Container>
    );
  }

  let data: HiscoresData | null = null;
  let problem: RecordsProblem | null = null;

  try {
    data = await fetchWwwJson<HiscoresData>(
      `/api/hiscores?skill=${encodeURIComponent(skill)}&page=${page}&mode=${mode}${worldQuery}`,
      { headers: visitor },
    );
  } catch (error) {
    problem = problemOf(error);
  }

  const worlds = await worldsPromise;
  const ranks = data?.ranks ?? [];
  const totalPages = data?.pages ?? 0;

  return (
    <Container className="py-16">
      <SectionTitle
        eyebrow={worldName(worlds) ?? "Rankings"}
        title={`${modeLabel(mode)} ${skillLabel(skill)} Hiscores`}
        description={
          mode === "ironman"
            ? "Ironman accounts ranked among themselves."
            : `${modeLabel(mode)} characters ranked among themselves.`
        }
      />

      {header(worlds)}

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {MODES.map((m) => (
          <Link
            key={m.id}
            href={buildHref({ mode: m.id, page: 0 })}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide border transition-colors",
              m.id === mode
                ? "border-gold-500/60 bg-gold-500/10 text-gold-400"
                : "border-stone-700 text-text-secondary hover:border-gold-500/40 hover:text-gold-400",
            )}
          >
            {m.id === "ironman" && <IronBadge accountMode={1} temper={0} />}
            {m.tier !== undefined && (
              <GameModeBadges gameMode={{ tier: m.tier, path: 0 }} />
            )}
            {m.label}
          </Link>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {HISCORE_SKILLS.map((s) => (
          <Link
            key={s}
            href={buildHref({ skill: s, page: 0 })}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium uppercase tracking-wide border transition-colors",
              s === skill
                ? "border-gold-500/60 bg-gold-500/10 text-gold-400"
                : "border-stone-700 text-text-secondary hover:border-gold-500/40 hover:text-gold-400",
            )}
          >
            <SkillIcon skill={s} className="w-4 h-4" />
            {skillLabel(s)}
          </Link>
        ))}
      </div>

      {problem === "busy" ? (
        <p className="mt-12 text-center text-text-secondary">
          Too many requests from your address. Try again in a minute.
        </p>
      ) : problem ? (
        <p className="mt-12 text-center text-text-secondary">
          Unable to load hiscores. The game server may be offline.
        </p>
      ) : ranks.length === 0 ? (
        <p className="mt-12 text-center text-text-secondary">
          {mode === "ironman"
            ? "No Ironman accounts are ranked yet. Choose Ironman when you register, or ask Paul in Lumbridge."
            : "No players are ranked yet — be the first!"}
        </p>
      ) : (
        <>
          <div className="mt-10 overflow-x-auto rounded-lg border border-stone-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 bg-stone-800/80">
                  <th className="px-4 py-3 text-left font-adventure uppercase tracking-wide text-gold-400">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left font-adventure uppercase tracking-wide text-gold-400">
                    Username
                  </th>
                  <th className="px-4 py-3 text-right font-adventure uppercase tracking-wide text-gold-400">
                    Level
                  </th>
                  <th className="px-4 py-3 text-right font-adventure uppercase tracking-wide text-gold-400">
                    Experience
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranks.map((entry, index) => (
                  <tr
                    key={entry.username}
                    className="border-b border-stone-800 last:border-0 hover:bg-stone-800/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-text-muted">
                      {page * RANKS_PER_PAGE + index + 1}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={buildHref({ username: entry.username })}
                        className="inline-flex items-center gap-1.5 text-text-primary hover:text-gold-400 transition-colors"
                      >
                        <Crown rank={entry.staffRank} />
                        <IronBadge
                          accountMode={entry.accountMode}
                          temper={entry.temper}
                        />
                        <GameModeBadges gameMode={entry.gameMode} />
                        {formatUsername(entry.username)}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-gold-400">
                      {formatNumber(entry.level)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-text-secondary">
                      {formatNumber(entry.experience)}
                      {entry.maxedAt ? (
                        <span className="ml-1.5 text-xs text-text-muted">
                          ({formatShortDate(entry.maxedAt)})
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) => buildHref({ page: p })}
          />
        </>
      )}
    </Container>
  );
}
