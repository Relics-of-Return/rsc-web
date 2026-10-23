"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ExternalLink,
  MapPin,
  Shield,
  Ship,
  Sparkles,
  Swords,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";

import {
  DAY,
  REALM_EVENTS,
  WEEK,
  WEEKDAYS,
  formatClock,
  formatCountdown,
  formatShort,
  formatUTC,
  occurrenceOf,
  schedule,
  type EventKind,
  type Occurrence,
  type RealmEvent,
} from "@/data/realm-events";
import { Reveal } from "@/components/ui/Reveal";

const KINDS: Record<
  EventKind,
  {
    label: string;
    Icon: typeof Sparkles;
    text: string;
    chip: string;
    bar: string;
  }
> = {
  skilling: {
    label: "Skilling",
    Icon: Sparkles,
    text: "text-[#f2ca50]",
    chip: "border-[#f2ca50]/40 bg-[#f2ca50]/10 text-[#f2ca50]",
    bar: "border-[#f2ca50]/70 bg-[#f2ca50]/25 text-[#ffe088]",
  },
  combat: {
    label: "Combat",
    Icon: Swords,
    text: "text-rose-300",
    chip: "border-rose-400/40 bg-rose-500/10 text-rose-300",
    bar: "border-rose-400/70 bg-rose-500/25 text-rose-200",
  },
  community: {
    label: "Community",
    Icon: Shield,
    text: "text-sky-300",
    chip: "border-sky-400/40 bg-sky-500/10 text-sky-300",
    bar: "border-sky-400/70 bg-sky-500/25 text-sky-200",
  },
  minigame: {
    label: "Minigame",
    Icon: Ship,
    text: "text-emerald-300",
    chip: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
    bar: "border-emerald-400/70 bg-emerald-500/25 text-emerald-200",
  },
};

function useNow(initial: number) {
  const [now, setNow] = useState(initial);

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  return now;
}

const noSubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}

function LocalTime({ time, mounted }: { time: number; mounted: boolean }) {
  if (!mounted) return null;

  const local = new Date(time * 1000).toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  return <span className="text-[#857968]"> · {local} your time</span>;
}

function EventLink({
  event,
  className,
}: {
  event: RealmEvent;
  className?: string;
}) {
  const { link } = event;
  if (!link) return null;

  const content = (
    <>
      {link.label}
      {link.external ? (
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </>
  );

  return link.external ? (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {content}
    </a>
  ) : (
    <Link href={link.href} className={className}>
      {content}
    </Link>
  );
}

function Spotlight({
  run,
  now,
  mounted,
}: {
  run: Occurrence;
  now: number;
  mounted: boolean;
}) {
  const { event, start, end, live } = run;
  const kind = KINDS[event.kind];
  const progress = live
    ? Math.min(100, ((now - start) / (end - start)) * 100)
    : 0;

  return (
    <article className="banner-frame relative flex h-full flex-col overflow-hidden rounded-sm bg-gradient-to-br from-[#1e1710] to-[#120e09] p-6 sm:p-8">
      <div className="relative flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-0.5 font-adventure text-xs uppercase tracking-wider",
            live
              ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-300"
              : "border-[#4d3c26] bg-[#16110b] text-[#d0c5af]",
          )}
        >
          {live && (
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"
              aria-hidden="true"
            />
          )}
          {live ? "Live now" : "Next up"}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-label text-[11px]",
            kind.chip,
          )}
        >
          <kind.Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {kind.label}
        </span>
      </div>

      <h3
        className={cn(
          "relative mt-4 font-adventure text-3xl font-bold leading-tight sm:text-4xl",
          live ? "text-[#f2ca50]" : "text-[#f5ebd9]",
        )}
      >
        {event.title}
      </h3>
      <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-[#d0c5af] sm:text-base">
        {event.description}
      </p>

      <dl className="relative mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs">
        {event.where && (
          <div className="flex items-center gap-1.5">
            <dt>
              <MapPin
                className={cn(
                  "h-3.5 w-3.5",
                  event.danger ? "text-rose-400" : "text-[#a89f8f]",
                )}
                aria-label="Where"
              />
            </dt>
            <dd className={event.danger ? "text-rose-300" : "text-[#d0c5af]"}>
              {event.where}
            </dd>
          </div>
        )}
        {event.host && (
          <div className="flex items-center gap-1.5">
            <dt>
              <User className="h-3.5 w-3.5 text-[#a89f8f]" aria-label="Host" />
            </dt>
            <dd className="text-[#d0c5af]">{event.host}</dd>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <dt>
            <CalendarClock
              className="h-3.5 w-3.5 text-[#a89f8f]"
              aria-label="When"
            />
          </dt>
          <dd className="text-[#d0c5af]">
            <time dateTime={new Date(start * 1000).toISOString()}>
              {formatUTC(start)}
            </time>
            {" – "}
            <time dateTime={new Date(end * 1000).toISOString()}>
              {end - start >= DAY ? formatUTC(end) : formatClock(end)}
            </time>
          </dd>
        </div>
      </dl>

      <div className="relative mt-auto pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-label text-[11px] uppercase tracking-[0.2em] text-[#a89f8f]">
              {live ? "Ends in" : "Starts in"}
            </p>
            <p
              className="mt-1 font-label text-3xl font-bold tabular-nums text-[#f5ebd9] sm:text-4xl"
              suppressHydrationWarning
              aria-live="off"
            >
              {formatCountdown((live ? end : start) - now)}
            </p>
          </div>
          <EventLink
            event={event}
            className="inline-flex items-center gap-2 rounded-sm border border-[#f2ca50]/50 bg-[#241b11] px-4 py-2 font-adventure text-sm font-bold uppercase tracking-wider text-[#f2ca50] transition-colors hover:bg-[#33271a]"
          />
        </div>

        {live && (
          <div className="mt-4">
            <div
              className="h-2 overflow-hidden rounded-full border border-[#3d3020] bg-[#0d0a07]"
              role="progressbar"
              aria-label={`${event.title} progress`}
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#b38e22] to-[#f2ca50] transition-[width] duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-[#857968]">
              Started {formatShort(now - start)} ago
              <LocalTime time={end} mounted={mounted} />
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

function Agenda({
  runs,
  now,
  mounted,
}: {
  runs: Occurrence[];
  now: number;
  mounted: boolean;
}) {
  return (
    <div className="flex h-full flex-col rounded-sm border-2 border-[#3b2e1e] bg-[#16110b] shadow-[inset_0_0_0_1px_#0b0805]">
      <div className="flex items-center justify-between border-b border-[#2d2418] bg-gradient-to-b from-[#241c13] to-[#191309] px-4 py-2.5">
        <h3 className="font-adventure text-sm font-bold uppercase tracking-wider text-[#f2ca50]">
          Coming up
        </h3>
        <span className="font-label text-[11px] text-[#857968]">
          Times in UTC
        </span>
      </div>

      <ol className="flex-1 divide-y divide-[#251c12]">
        {runs.map(({ event, start, end, live }) => {
          const kind = KINDS[event.kind];
          const date = new Date(start * 1000);

          return (
            <li
              key={event.id}
              className="group relative flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-[#1d160e]"
            >
              <time
                dateTime={date.toISOString()}
                className="flex w-14 shrink-0 flex-col items-center rounded-sm border border-[#33271a] bg-[#0f0c08] py-1.5"
              >
                <span className="font-adventure text-sm font-bold text-[#f5ebd9]">
                  {WEEKDAYS[date.getUTCDay()]}
                </span>
                <span className="font-label text-[11px] text-[#a89f8f]">
                  {formatClock(start).replace(" UTC", "")}
                </span>
              </time>

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5">
                  <kind.Icon
                    className={cn("h-3.5 w-3.5 shrink-0", kind.text)}
                    aria-hidden="true"
                  />
                  <span className="truncate font-adventure text-base font-bold text-[#f5ebd9] group-hover:text-[#f2ca50]">
                    {event.link && !event.link.external ? (
                      <Link
                        href={event.link.href}
                        className="after:absolute after:inset-0"
                      >
                        {event.title}
                      </Link>
                    ) : event.link ? (
                      <a
                        href={event.link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="after:absolute after:inset-0"
                      >
                        {event.title}
                      </a>
                    ) : (
                      event.title
                    )}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-xs">
                  <span
                    className={
                      event.danger ? "text-rose-300/90" : "text-[#a89f8f]"
                    }
                  >
                    {event.where ?? kind.label}
                  </span>
                  <LocalTime time={start} mounted={mounted} />
                </p>
              </div>

              <span
                className={cn(
                  "shrink-0 rounded-sm border px-2 py-0.5 font-label text-[11px] tabular-nums",
                  live
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                    : "border-[#3d3020] bg-[#0f0c08] text-[#d0c5af]",
                )}
                suppressHydrationWarning
              >
                {live
                  ? `Live · ${formatShort(end - now)} left`
                  : `in ${formatShort(start - now)}`}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The next seven days from midnight UTC, every event a bar on its own row, and a line for now. */
function WeekTimeline({ now }: { now: number }) {
  const date = new Date(now * 1000);
  const from =
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
    1000;
  const to = from + WEEK;
  const share = (time: number) =>
    ((Math.min(Math.max(time, from), to) - from) / (to - from)) * 100;

  const days = Array.from(
    { length: 7 },
    (_, i) => new Date((from + i * DAY) * 1000),
  );

  const rows = REALM_EVENTS.map((event) => {
    const runs: Occurrence[] = [];

    for (
      let run = occurrenceOf(event, from);
      run.start < to;
      run = occurrenceOf(event, run.end)
    ) {
      runs.push(run);
    }

    return { event, runs };
  });

  return (
    <div className="mt-6 hidden gap-3 rounded-sm border border-[#2b2216] bg-[#0f0c08] p-4 md:flex">
      <div className="w-44 shrink-0">
        <p className="h-5 font-label text-[11px] uppercase tracking-wider text-[#857968]">
          This week
        </p>
        <ul className="mt-2 space-y-1.5">
          {rows.map(({ event }) => {
            const kind = KINDS[event.kind];

            return (
              <li
                key={event.id}
                className="flex h-6 items-center gap-1.5 text-xs text-[#d0c5af]"
              >
                <kind.Icon
                  className={cn("h-3.5 w-3.5 shrink-0", kind.text)}
                  aria-hidden="true"
                />
                <span className="truncate">{event.title}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="relative flex-1">
        <div
          className="pointer-events-none absolute inset-0 grid grid-cols-7"
          aria-hidden="true"
        >
          {days.map((day) => (
            <span
              key={day.toISOString()}
              className="border-l border-[#2b2216]"
            />
          ))}
        </div>

        <div className="relative grid h-5 grid-cols-7">
          {days.map((day, i) => (
            <span
              key={day.toISOString()}
              className={cn(
                "pl-2 font-label text-[11px] uppercase tracking-wider",
                i === 0 ? "text-[#f2ca50]" : "text-[#857968]",
              )}
            >
              {i === 0 ? "Today" : WEEKDAYS[day.getUTCDay()]} {day.getUTCDate()}
            </span>
          ))}
        </div>

        <ul className="relative mt-2 space-y-1.5">
          {rows.map(({ event, runs }) => (
            <li key={event.id} className="relative h-6">
              {runs.map((run) => (
                <span
                  key={run.start}
                  className={cn(
                    "absolute inset-y-0.5 flex items-center overflow-hidden rounded-sm border px-1.5 font-label text-[10px] whitespace-nowrap",
                    KINDS[event.kind].bar,
                    run.end <= now && "opacity-40",
                  )}
                  // a two-hour event is a sliver of a week: wide enough to read its start
                  style={{
                    left: `${share(run.start)}%`,
                    width: `${share(run.end) - share(run.start)}%`,
                    minWidth: "2.75rem",
                  }}
                  title={`${event.title}: ${formatUTC(run.start)} – ${formatUTC(run.end)}`}
                >
                  {formatClock(run.start).replace(" UTC", "")}
                </span>
              ))}
            </li>
          ))}
        </ul>

        <span
          className="pointer-events-none absolute top-5 bottom-0 w-px bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
          style={{ left: `${share(now)}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export function RealmEvents({ serverNow }: { serverNow: number }) {
  const now = useNow(serverNow);
  const mounted = useMounted();

  const runs = schedule(REALM_EVENTS, now);
  const [spotlight, ...rest] = runs;
  const liveCount = runs.filter((run) => run.live).length;

  if (!spotlight) return null;

  return (
    <section className="relative w-full border-b border-[#292015] bg-[#110e0a] py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-3 border-b border-[#2b2216] pb-4 sm:flex-row sm:items-end">
          <div className="flex items-center gap-3">
            <CalendarClock
              className="h-6 w-6 text-[#f2ca50]"
              aria-hidden="true"
            />
            <h2 className="font-adventure text-3xl font-bold tracking-wide text-[#f5ebd9] sm:text-4xl">
              Realm Events
            </h2>
          </div>
          <div className="flex items-center gap-3 font-label text-xs text-[#a89f8f]">
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                {liveCount > 0 && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={cn(
                    "relative inline-flex h-2 w-2 rounded-full",
                    liveCount > 0 ? "bg-emerald-500" : "bg-stone-700",
                  )}
                />
              </span>
              <span
                className={liveCount > 0 ? "font-bold text-emerald-400" : ""}
              >
                {liveCount} live now
              </span>
            </span>
            <span className="text-[#382e20]" aria-hidden="true">
              •
            </span>
            <span suppressHydrationWarning>Realm time {formatClock(now)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <Spotlight run={spotlight} now={now} mounted={mounted} />
          </Reveal>
          <Reveal delay={120} className="lg:col-span-5">
            <Agenda runs={rest} now={now} mounted={mounted} />
          </Reveal>
        </div>

        <Reveal delay={200}>
          <WeekTimeline now={now} />
        </Reveal>
      </div>
    </section>
  );
}
