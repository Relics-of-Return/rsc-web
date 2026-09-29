import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formats a number with US-style thousands separators. */
export function formatNumber(value: number | undefined | null): string {
  return Number(value ?? 0).toLocaleString('en-US')
}

/** Formats a unix timestamp (seconds) as a human-readable date. */
export function formatUnixDate(unixSeconds: number | undefined | null): string {
  if (!unixSeconds) return ''
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Formats a unix timestamp (seconds) as a date and time, or a dash when unset. */
export function formatUnixDateTime(unixSeconds: number | undefined | null): string {
  if (!unixSeconds) return '—'
  return new Date(unixSeconds * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Formats a unix timestamp (seconds) as DD Month YYYY (e.g., "20 September 2026"). */
export function formatNewsDate(unixSeconds: number | undefined | null): string {
  if (!unixSeconds) return ''
  return new Date(unixSeconds * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
