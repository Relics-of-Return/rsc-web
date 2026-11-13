/**
 * Player polls (documentation/TBA/POLLS.md): what rsc-www's /api/polls and
 * /api/admin/polls return, and Admin → Polls' calls. Votes are only cast at
 * the poll booths in game.
 */

import { ApiError, apiJSON } from '@/lib/api'

export type PollKind = 'greenlight' | 'lockin' | 'opinion'

export interface PollQuestion {
  heading?: string
  note?: string
  text: string
  answers: string[]
  skip?: boolean
}

export interface PollRequirements {
  totalLevel: number
  hours: number
  worlds: number[]
  perIP: number
}

export interface PollQuestionResult {
  counts: number[]
  skipped: number
  answered: number
  percents: number[]
  popular: number
  passed: boolean | null
}

export interface Poll {
  id: number
  title: string
  kind: PollKind
  summary: string
  description: string
  newsId: number | null
  image: string | null
  questions: PollQuestion[]
  requirements: PollRequirements
  opensAt: number
  closesAt: number
  state: 'scheduled' | 'open' | 'closed'
  ballots?: number
  results?: { ballots: number; questions: PollQuestionResult[] }
}

export type PollDraft = Omit<Poll, 'id' | 'state' | 'ballots' | 'results'>

export const POLL_KINDS: { value: PollKind; label: string }[] = [
  { value: 'greenlight', label: 'Greenlight poll' },
  { value: 'lockin', label: 'Lock-in poll' },
  { value: 'opinion', label: 'Opinion survey' },
]

export const DEFAULT_REQUIREMENTS: PollRequirements = {
  totalLevel: 100,
  hours: 5,
  worlds: [1, 3, 4],
  perIP: 3,
}

/** The year (UTC) a poll opened, which files it on the website. */
export function pollYear(poll: Pick<Poll, 'opensAt'>): number {
  return new Date(poll.opensAt * 1000).getUTCFullYear()
}

/** The website's page for a poll: /polls/<year it opened>/<id>. */
export function pollPath(poll: Pick<Poll, 'id' | 'opensAt'>): string {
  return `/polls/${pollYear(poll)}/${poll.id}`
}

/** The polls' admin calls say plainly when the caller isn't an administrator. */
function adminOnly(error: unknown): never {
  throw error instanceof ApiError && (error.status === 401 || error.status === 403)
    ? new Error('Administrators only.')
    : error
}

export function getAdminPolls(): Promise<{ polls: Poll[] }> {
  return apiJSON<{ polls: Poll[] }>('/api/admin/polls').catch(adminOnly)
}

export function savePoll(poll: PollDraft, id?: number): Promise<{ success: boolean; id: number }> {
  return apiJSON<{ success: boolean; id: number }>('/api/admin/polls', {
    action: 'save',
    id: id ?? null,
    poll,
  }).catch(adminOnly)
}

export function deletePoll(id: number): Promise<{ success: boolean }> {
  return apiJSON<{ success: boolean }>('/api/admin/polls', { action: 'delete', id }).catch(
    adminOnly,
  )
}
