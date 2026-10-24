/**
 * The official release countdown target, shared by every surface that shows
 * the countdown so the moment is defined in exactly one place.
 *
 * Change {@link COUNTDOWN_TARGET_ISO} to move the countdown, then rebuild and
 * redeploy the site: the landing hero bundles the instant at build time. Keep
 * an explicit UTC offset so every visitor counts to the same moment.
 */

/** The release moment as an ISO 8601 instant with its UTC offset. */
export const COUNTDOWN_TARGET_ISO = "2026-12-11T11:59:59-05:00";

export const COUNTDOWN_TARGET_MS = Date.parse(COUNTDOWN_TARGET_ISO);

/** The small heading above the hero plaque. */
export const COUNTDOWN_TITLE = "The Return Begins In";

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Split the time left until `targetMs` into whole days, hours, minutes and seconds. */
export function countdownParts(
  nowMs: number,
  targetMs: number = COUNTDOWN_TARGET_MS,
): CountdownParts {
  const left = Math.max(0, targetMs - nowMs);

  return {
    days: Math.floor(left / DAY),
    hours: Math.floor((left % DAY) / HOUR),
    minutes: Math.floor((left % HOUR) / MINUTE),
    seconds: Math.floor((left % MINUTE) / SECOND),
    expired: targetMs - nowMs <= 0,
  };
}

/** The plaque's columns, in reading order. */
export const COUNTDOWN_UNITS = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Minutes" },
  { key: "seconds", label: "Seconds" },
] as const;
