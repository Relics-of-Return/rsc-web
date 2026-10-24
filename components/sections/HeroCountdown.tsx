"use client";

import { Fragment, useEffect, useState } from "react";

import {
  COUNTDOWN_TARGET_ISO,
  COUNTDOWN_TARGET_MS,
  COUNTDOWN_TITLE,
  COUNTDOWN_UNITS,
  countdownParts,
} from "@/data/site-countdown";

const pad = (value: number) => String(value).padStart(2, "0");

const plural = (value: number, unit: string) =>
  `${value} ${value === 1 ? unit : `${unit}s`}`;

/** Spoken date; the hero's target is an Eastern-time instant, so pin the zone. */
const TARGET_DATE_LABEL = new Date(COUNTDOWN_TARGET_ISO).toLocaleDateString(
  "en-US",
  { dateStyle: "long", timeZone: "America/Toronto" },
);

/**
 * Alagard's figures are proportional (and it has no `tnum` feature), so each
 * digit gets a fixed 0.625em cell — the width of its widest glyph — to stop the
 * seconds from nudging the whole value back and forth every tick.
 */
function Digits({ value }: { value: number }) {
  return (
    <span className="inline-flex font-adventure text-[1.85rem] leading-none text-[#f2ca50] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] sm:text-[2.35rem]">
      {pad(value)
        .split("")
        .map((digit, index) => (
          <span key={index} className="inline-block w-[0.625em] text-center">
            {digit}
          </span>
        ))}
    </span>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex w-[3.6rem] flex-col items-center sm:w-[4.6rem]">
      <Digits value={value} />
      <span className="mt-2 font-label text-[8.5px] uppercase tracking-[0.22em] text-[#b8ab92] sm:text-[9.5px]">
        {label}
      </span>
    </div>
  );
}

/** A hairline with a small gold lozenge, between two units. */
function Separator() {
  return (
    <span
      aria-hidden="true"
      className="relative mx-0.5 flex h-10 w-2.5 items-center justify-center sm:mx-2 sm:h-12"
    >
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#f2ca50]/30 to-transparent" />
      <span className="relative h-[5px] w-[5px] rotate-45 border border-[#f2ca50]/60 bg-[#0a0805]" />
    </span>
  );
}

/**
 * The official release countdown, set into the landing hero as an engraved
 * plaque under the tagline.
 *
 * `serverNow` (unix seconds) comes from the home page so the first render is
 * identical on both sides of hydration; it starts ticking once mounted.
 */
export function HeroCountdown({
  serverNow,
  delayMs = 420,
}: {
  serverNow: number;
  delayMs?: number;
}) {
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    let timer: number | undefined;

    const tick = () => {
      const nowMs = Date.now();

      setNow(Math.floor(nowMs / 1000));

      if (nowMs < COUNTDOWN_TARGET_MS) {
        timer = window.setTimeout(tick, 1000 - (nowMs % 1000));
      }
    };

    tick();
    return () => window.clearTimeout(timer);
  }, []);

  const parts = countdownParts(now * 1000);

  const values = {
    days: parts.days,
    hours: parts.hours,
    minutes: parts.minutes,
    seconds: parts.seconds,
  } satisfies Record<(typeof COUNTDOWN_UNITS)[number]["key"], number>;

  const spoken = parts.expired
    ? `The return has begun. The official release was ${TARGET_DATE_LABEL}.`
    : `Official release countdown: ${plural(parts.days, "day")}, ${plural(parts.hours, "hour")}, ${plural(parts.minutes, "minute")} and ${plural(parts.seconds, "second")} until ${TARGET_DATE_LABEL}.`;

  return (
    <div
      className="fx-fade-in-up mb-5 flex flex-col items-center"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <p className="mb-2.5 flex items-center gap-2.5 font-label text-[9.5px] uppercase tracking-[0.28em] text-[#ecdfbd]/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] sm:gap-3 sm:text-[10.5px]">
        <span
          aria-hidden="true"
          className="h-px w-7 bg-gradient-to-r from-transparent to-[#f2ca50]/70 sm:w-11"
        />
        {COUNTDOWN_TITLE}
        <span
          aria-hidden="true"
          className="h-px w-7 bg-gradient-to-l from-transparent to-[#f2ca50]/70 sm:w-11"
        />
      </p>

      <div
        role="timer"
        aria-live="off"
        aria-label={spoken}
        className="relative overflow-hidden rounded-[3px] border border-[#f2ca50]/35 bg-[#0a0805]/75 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_0_22px_rgba(0,0,0,0.6),0_18px_40px_-14px_rgba(0,0,0,0.95)] backdrop-blur-[2px] sm:px-5 sm:py-2.5"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(242,202,80,0.16),transparent_65%)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-1/2 h-px w-24 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#f2ca50]/60 to-transparent sm:w-32"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1 left-1 h-2.5 w-2.5 border-t border-l border-[#f2ca50]/35"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1 right-1 h-2.5 w-2.5 border-t border-r border-[#f2ca50]/35"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 left-1 h-2.5 w-2.5 border-b border-l border-[#f2ca50]/35"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-1 bottom-1 h-2.5 w-2.5 border-r border-b border-[#f2ca50]/35"
        />

        {parts.expired ? (
          <div
            aria-hidden="true"
            className="relative flex items-center justify-center gap-2.5 px-2 py-1.5"
          >
            <span aria-hidden="true" className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f2ca50]/70 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f2ca50]" />
            </span>
            <span className="font-adventure text-xl tracking-wide text-[#f2ca50] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] sm:text-2xl">
              The Return Has Begun
            </span>
          </div>
        ) : (
          <div className="relative flex items-center" aria-hidden="true">
            {COUNTDOWN_UNITS.map((unit, index) => (
              <Fragment key={unit.key}>
                {index > 0 && <Separator />}
                <Unit value={values[unit.key]} label={unit.label} />
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
