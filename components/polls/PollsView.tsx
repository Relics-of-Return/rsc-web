import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import {
  POLL_KINDS,
  pollPath,
  pollYear,
  type Poll,
  type PollKind,
  type PollQuestion,
  type PollQuestionResult,
} from "@/lib/polls";
import { cn, formatNumber } from "@/lib/utils";
import { fetchWwwJson } from "@/lib/www";

// PASS_MARK in rsc-data-server-dev/src/polls.js
const PASS_PERCENT = 70;

const KIND_DOT: Record<PollKind, string> = {
  greenlight: "bg-moss",
  lockin: "bg-ember",
  opinion: "bg-rune-blue",
};

const KIND_SHORT: Record<PollKind, string> = {
  greenlight: "Greenlight",
  lockin: "Lock-in",
  opinion: "Opinion",
};

/** Every poll that has opened, newest first; null when rsc-www cannot be reached. */
export async function loadPolls(): Promise<Poll[] | null> {
  try {
    // shared between visitors for a minute: results only show once a poll has closed
    const data = await fetchWwwJson<{ polls?: Poll[] }>("/api/polls", {
      revalidate: 60,
    });
    return data.polls ?? [];
  } catch {
    return null;
  }
}

function utcDate(seconds: number, options: Intl.DateTimeFormatOptions): string {
  return new Date(seconds * 1000).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    ...options,
  });
}

/** "14 – 21 Nov 2026", "28 Nov – 5 Dec 2026", "28 Dec 2026 – 4 Jan 2027". */
function dateRange(opensAt: number, closesAt: number): string {
  const start = new Date(opensAt * 1000);
  const end = new Date(closesAt * 1000);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();
  const from = utcDate(
    opensAt,
    sameMonth
      ? { day: "numeric" }
      : sameYear
        ? { day: "numeric", month: "short" }
        : { day: "numeric", month: "short", year: "numeric" },
  );

  return `${from} – ${utcDate(closesAt, { day: "numeric", month: "short", year: "numeric" })}`;
}

function closesIn(closesAt: number): string {
  const days = Math.ceil((closesAt * 1000 - Date.now()) / 86_400_000);
  return days > 1 ? `closes in ${days} days` : "closes within a day";
}

/** "1, 3 or 4" */
function orList(values: number[]): string {
  return values.length > 1
    ? `${values.slice(0, -1).join(", ")} or ${values[values.length - 1]}`
    : values.join("");
}

/** A heading starts a section; the questions after it belong to it until the next heading. */
function sections(questions: PollQuestion[]) {
  const out: {
    heading?: string;
    note?: string;
    items: { question: PollQuestion; index: number }[];
  }[] = [];

  questions.forEach((question, index) => {
    if (question.heading || out.length === 0) {
      out.push({ heading: question.heading, note: question.note, items: [] });
    }
    out[out.length - 1].items.push({ question, index });
  });

  return out;
}

function KindLabel({ kind, long = false }: { kind: PollKind; long?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
      <span
        className={cn("h-2 w-2 rounded-full", KIND_DOT[kind])}
        aria-hidden
      />
      {long
        ? POLL_KINDS.find((k) => k.value === kind)?.label
        : KIND_SHORT[kind]}
    </span>
  );
}

function LiveTag() {
  return (
    <span className="rounded bg-rune-red px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-primary">
      Live
    </span>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-xl font-semibold text-text-primary tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-text-muted">{label}</p>
    </div>
  );
}

function QuestionCard({
  number,
  question,
  result,
  closesAt,
}: {
  number: number;
  question: PollQuestion;
  result?: PollQuestionResult;
  closesAt: number;
}) {
  const marked = result?.passed != null;

  return (
    <article className="flex gap-4 rounded-lg border border-stone-700 bg-stone-800/60 p-5 sm:gap-6 sm:p-7">
      <span
        className="font-adventure text-2xl leading-none text-text-muted"
        aria-hidden
      >
        {number}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-medium leading-snug text-text-primary">
            {question.text}
          </h3>
          {marked && (
            <span
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                result.passed
                  ? "border-moss/50 bg-moss/15 text-moss"
                  : "border-rune-red/60 bg-rune-red/15 text-ember",
              )}
            >
              {result.passed ? "Passed" : "Failed"}
            </span>
          )}
        </div>

        {result ? (
          <>
            <ul className="mt-5 space-y-3">
              {question.answers.map((answer, i) => {
                const popular = i === result.popular;
                return (
                  <li
                    key={i}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[7rem_1fr_4rem_4rem]"
                  >
                    <span
                      className={cn(
                        "truncate",
                        popular
                          ? "font-semibold text-text-primary"
                          : "text-text-secondary",
                      )}
                    >
                      {answer}
                    </span>
                    <span className="relative col-span-3 row-start-2 h-2 rounded-full bg-stone-700 sm:col-span-1 sm:row-start-auto">
                      <span
                        className={cn(
                          "absolute inset-y-0 left-0 rounded-full",
                          popular ? "bg-text-primary" : "bg-text-muted",
                        )}
                        style={{ width: `${result.percents[i]}%` }}
                      />
                      {marked && (
                        <span
                          className="absolute -inset-y-1 w-0.5 rounded-full bg-gold-500"
                          style={{ left: `${PASS_PERCENT}%` }}
                          aria-hidden
                        />
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-right tabular-nums",
                        popular
                          ? "font-semibold text-text-primary"
                          : "text-text-secondary",
                      )}
                    >
                      {result.percents[i]}%
                    </span>
                    <span className="text-right text-sm tabular-nums text-text-muted">
                      {formatNumber(result.counts[i])}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 flex items-center gap-3 text-xs text-text-muted">
              <span>Skipped {formatNumber(result.skipped)}</span>
              {marked && (
                <span className="border-l-2 border-gold-500 pl-2">
                  {PASS_PERCENT}% to pass
                </span>
              )}
            </p>
          </>
        ) : (
          <>
            <ul className="mt-4 space-y-2">
              {question.answers.map((answer, i) => (
                <li
                  key={i}
                  className="rounded-md border border-stone-700 px-4 py-2 text-text-secondary"
                >
                  {answer}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-text-muted">
              Results are shown when the poll closes on{" "}
              {utcDate(closesAt, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              .
            </p>
          </>
        )}
      </div>
    </article>
  );
}

/** The polls archive (documentation/TBA/POLLS.md): past polls by year on the side, one poll in full. */
export function PollsView({ polls, poll }: { polls: Poll[]; poll: Poll }) {
  const year = pollYear(poll);
  const years = [...new Set(polls.map(pollYear))];
  const closed = poll.state === "closed";
  const verdicts =
    poll.results?.questions.filter((q) => q.passed != null) ?? [];
  const { requirements } = poll;

  return (
    <Container className="py-12 lg:py-16">
      <div className="grid gap-10 lg:grid-cols-[17rem_1fr] lg:gap-12">
        <aside className="order-last lg:order-first lg:sticky lg:top-24 lg:self-start">
          <h1 className="font-adventure text-3xl uppercase tracking-wide text-gold-500">
            Polls
          </h1>

          <nav
            className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0"
            aria-label="Year"
          >
            {years.map((y) => (
              <Link
                key={y}
                href={`/polls/${y}`}
                aria-current={y === year ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1 text-xs font-semibold tabular-nums transition-colors",
                  y === year
                    ? "border-gold-500/60 bg-gold-500/10 text-gold-400"
                    : "border-stone-700 text-text-secondary hover:border-gold-500/40 hover:text-gold-400",
                )}
              >
                {y}
              </Link>
            ))}
          </nav>

          <ul className="mt-5 space-y-1">
            {polls
              .filter((p) => pollYear(p) === year)
              .map((p) => (
                <li key={p.id}>
                  <Link
                    href={pollPath(p)}
                    aria-current={p.id === poll.id ? "page" : undefined}
                    className={cn(
                      "block rounded-lg border px-4 py-3 transition-colors",
                      p.id === poll.id
                        ? "border-stone-700 bg-stone-800/60"
                        : "border-transparent hover:border-stone-700 hover:bg-stone-800/30",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <KindLabel kind={p.kind} />
                      {p.state === "open" && <LiveTag />}
                    </span>
                    <span className="mt-1.5 block font-medium text-text-primary">
                      {p.title}
                    </span>
                    <span className="mt-1 block text-xs text-text-muted">
                      {p.state === "open"
                        ? `Live · ${closesIn(p.closesAt)}`
                        : dateRange(p.opensAt, p.closesAt)}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </aside>

        <div className="min-w-0">
          <header className="rounded-lg border border-stone-700 bg-stone-800/60 p-6 sm:p-8">
            <p className="flex flex-wrap items-center gap-3">
              <KindLabel kind={poll.kind} long />
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">
                · {closed ? "Closed" : "Open"}
              </span>
              {!closed && <LiveTag />}
            </p>
            <h2 className="mt-3 font-adventure text-3xl uppercase tracking-wide text-gold-400 sm:text-4xl">
              {poll.title}
            </h2>
            {poll.summary && (
              <p className="mt-4 max-w-2xl text-text-secondary">
                {poll.summary}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
              {closed && (
                <Stat
                  value={formatNumber(poll.results?.ballots)}
                  label="Total votes"
                />
              )}
              <Stat value={String(poll.questions.length)} label="Questions" />
              {closed && verdicts.length > 0 && (
                <Stat
                  value={`${verdicts.filter((q) => q.passed).length} of ${verdicts.length}`}
                  label="Passed"
                />
              )}
              <Stat
                value={dateRange(poll.opensAt, poll.closesAt).replace(
                  / \d{4}$/,
                  "",
                )}
                label={
                  closed
                    ? String(new Date(poll.closesAt * 1000).getUTCFullYear())
                    : closesIn(poll.closesAt)
                }
              />
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {poll.newsId != null && (
                <Button asChild size="sm">
                  <Link href={`/news/${poll.newsId}`}>Read the newsletter</Link>
                </Button>
              )}
              <Button asChild size="sm" variant="secondary">
                <a href="#questions">Jump to questions</a>
              </Button>
            </div>
          </header>

          <div id="questions" className="scroll-mt-24">
            {sections(poll.questions).map((section, s) => (
              <section key={s} className="mt-10">
                {section.heading && (
                  <h3 className="font-adventure text-2xl uppercase tracking-wide text-gold-500">
                    {section.heading}
                  </h3>
                )}
                {section.note && (
                  <p className="mt-1 text-sm text-text-secondary">
                    {section.note}
                  </p>
                )}
                <div
                  className={cn(
                    "space-y-5",
                    section.heading || section.note ? "mt-5" : "",
                  )}
                >
                  {section.items.map(({ question, index }) => (
                    <QuestionCard
                      key={index}
                      number={index + 1}
                      question={question}
                      result={poll.results?.questions[index]}
                      closesAt={poll.closesAt}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-10 rounded-lg border border-dashed border-stone-700 px-5 py-4 text-sm text-text-secondary">
            Votes are cast at any poll booth in game, one ballot per account.
            Results stay hidden until a poll closes.
            {!closed &&
              ` To vote you need a total level of ${requirements.totalLevel} and ${requirements.hours} hours played, on World ${orList(requirements.worlds)}.`}
          </p>
        </div>
      </div>
    </Container>
  );
}

export function PollsUnavailable({ offline }: { offline: boolean }) {
  return (
    <Container className="py-16 text-center">
      <h1 className="font-adventure text-3xl uppercase tracking-wide text-gold-500">
        Polls
      </h1>
      <p className="mt-6 text-text-secondary">
        {offline
          ? "Unable to load polls. The game server may be offline."
          : "No polls have been held yet."}
      </p>
    </Container>
  );
}
