'use client'

import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import {
  DEFAULT_REQUIREMENTS,
  POLL_KINDS,
  deletePoll,
  getAdminPolls,
  pollPath,
  savePoll,
  type Poll,
  type PollDraft,
  type PollQuestion,
} from '@/lib/polls'

const field =
  'w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-text-primary focus:border-gold-500 focus:outline-none'
const label = 'block text-xs uppercase tracking-wide text-text-muted'

const STATE_STYLE: Record<Poll['state'], string> = {
  scheduled: 'border-rune-blue/50 bg-rune-blue/10 text-rune-blue',
  open: 'border-moss/50 bg-moss/10 text-moss',
  closed: 'border-stone-600 bg-stone-800 text-text-secondary',
}

// unix seconds <-> the datetime-local input's local time
function toLocalInput(seconds: number): string {
  const date = new Date(seconds * 1000)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function fromLocalInput(value: string): number {
  return Math.floor(new Date(value).getTime() / 1000)
}

function blankPoll(): PollDraft {
  const now = Math.floor(Date.now() / 1000)
  const opensAt = now - (now % 3600) + 3600

  return {
    title: '',
    kind: 'lockin',
    summary: '',
    description: '',
    newsId: null,
    image: null,
    questions: [{ text: '', answers: ['Yes', 'No'], skip: true }],
    requirements: { ...DEFAULT_REQUIREMENTS },
    opensAt,
    closesAt: opensAt + 7 * 86400,
  }
}

function draftOf(poll: Poll): PollDraft {
  return {
    title: poll.title,
    kind: poll.kind,
    summary: poll.summary,
    description: poll.description,
    newsId: poll.newsId,
    image: poll.image,
    questions: poll.questions,
    requirements: poll.requirements,
    opensAt: poll.opensAt,
    closesAt: poll.closesAt,
  }
}

function PollEditor({ poll, onClose }: { poll: Poll | null; onClose: (saved: boolean) => void }) {
  const [draft, setDraft] = useState<PollDraft>(() => (poll ? draftOf(poll) : blankPoll()))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const locked = poll !== null && poll.state !== 'scheduled'

  const set = <K extends keyof PollDraft>(key: K, value: PollDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const setQuestion = (index: number, change: Partial<PollQuestion>) =>
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q, i) => (i === index ? { ...q, ...change } : q)),
    }))
  const moveQuestion = (index: number, by: number) =>
    setDraft((d) => {
      const questions = [...d.questions]
      const [q] = questions.splice(index, 1)
      questions.splice(index + by, 0, q)
      return { ...d, questions }
    })

  const save = async () => {
    setSaving(true)
    setError(null)

    try {
      await savePoll(
        {
          ...draft,
          questions: draft.questions.map((q) => ({
            ...q,
            answers: q.answers.map((a) => a.trim()).filter(Boolean),
          })),
        },
        poll?.id,
      )
      onClose(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The poll could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 border-b border-stone-700 bg-stone-900/40 px-5 py-5">
      {locked && (
        <p className="rounded border border-ember/40 bg-ember/10 px-3 py-2 text-xs text-parchment">
          This poll has opened: its questions, answers, kind, opening time and requirements are locked. The words around
          them and the closing time can still change.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <label>
          <span className={label}>Title</span>
          <input className={field} maxLength={80} value={draft.title} onChange={(e) => set('title', e.target.value)} />
        </label>
        <label>
          <span className={label}>Kind</span>
          <select
            className={field}
            disabled={locked}
            value={draft.kind}
            onChange={(e) => set('kind', e.target.value as PollDraft['kind'])}
          >
            {POLL_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className={label}>Summary (the line under the title)</span>
        <input
          className={field}
          maxLength={200}
          value={draft.summary}
          onChange={(e) => set('summary', e.target.value)}
        />
      </label>

      <label className="block">
        <span className={label}>Description (newsletter markdown, shown in game and on the website)</span>
        <textarea
          className={`${field} min-h-28 font-mono`}
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-4">
        <label>
          <span className={label}>Opens</span>
          <input
            type="datetime-local"
            className={field}
            disabled={locked}
            value={toLocalInput(draft.opensAt)}
            onChange={(e) => set('opensAt', fromLocalInput(e.target.value))}
          />
        </label>
        <label>
          <span className={label}>Closes</span>
          <input
            type="datetime-local"
            className={field}
            value={toLocalInput(draft.closesAt)}
            onChange={(e) => set('closesAt', fromLocalInput(e.target.value))}
          />
        </label>
        <label>
          <span className={label}>Newsletter id</span>
          <input
            type="number"
            min={1}
            className={field}
            value={draft.newsId ?? ''}
            onChange={(e) => set('newsId', e.target.value ? Number(e.target.value) : null)}
          />
        </label>
        <label>
          <span className={label}>Card picture (news image path)</span>
          <input
            className={field}
            maxLength={200}
            value={draft.image ?? ''}
            onChange={(e) => set('image', e.target.value || null)}
          />
        </label>
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-4" disabled={locked}>
        <label>
          <span className={label}>Total level</span>
          <input
            type="number"
            min={0}
            className={field}
            value={draft.requirements.totalLevel}
            onChange={(e) =>
              set('requirements', {
                ...draft.requirements,
                totalLevel: Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          <span className={label}>Hours played</span>
          <input
            type="number"
            min={0}
            className={field}
            value={draft.requirements.hours}
            onChange={(e) =>
              set('requirements', {
                ...draft.requirements,
                hours: Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          <span className={label}>Worlds that vote</span>
          <input
            className={field}
            value={draft.requirements.worlds.join(', ')}
            onChange={(e) =>
              set('requirements', {
                ...draft.requirements,
                worlds: e.target.value
                  .split(/[\s,]+/)
                  .filter(Boolean)
                  .map(Number)
                  .filter(Number.isInteger),
              })
            }
          />
        </label>
        <label>
          <span className={label}>Ballots per IP</span>
          <input
            type="number"
            min={1}
            className={field}
            value={draft.requirements.perIP}
            onChange={(e) =>
              set('requirements', {
                ...draft.requirements,
                perIP: Number(e.target.value),
              })
            }
          />
        </label>
      </fieldset>

      <div className="space-y-3">
        <h3 className="font-adventure text-sm uppercase tracking-wide text-gold-400">Questions</h3>
        {draft.questions.map((q, i) => (
          <div key={i} className="space-y-3 rounded border border-stone-700 bg-stone-900/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-text-muted">Question {i + 1}</span>
              {!locked && (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={i === 0}
                    onClick={() => moveQuestion(i, -1)}
                  >
                    Up
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={i === draft.questions.length - 1}
                    onClick={() => moveQuestion(i, 1)}
                  >
                    Down
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={draft.questions.length === 1}
                    onClick={() =>
                      set(
                        'questions',
                        draft.questions.filter((_, j) => j !== i),
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className={label}>Section heading (starts a new section)</span>
                <input
                  className={field}
                  maxLength={80}
                  value={q.heading ?? ''}
                  onChange={(e) => setQuestion(i, { heading: e.target.value })}
                />
              </label>
              <label>
                <span className={label}>Note under the heading</span>
                <input
                  className={field}
                  maxLength={300}
                  value={q.note ?? ''}
                  onChange={(e) => setQuestion(i, { note: e.target.value })}
                />
              </label>
            </div>
            <label className="block">
              <span className={label}>Question</span>
              <textarea
                className={field}
                disabled={locked}
                maxLength={400}
                value={q.text}
                onChange={(e) => setQuestion(i, { text: e.target.value })}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label>
                <span className={label}>Answers, one per line (start with Yes for a 70% pass mark)</span>
                <textarea
                  className={`${field} min-h-16`}
                  disabled={locked}
                  value={q.answers.join('\n')}
                  onChange={(e) => setQuestion(i, { answers: e.target.value.split('\n') })}
                />
              </label>
              <label className="flex items-center gap-2 pb-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  disabled={locked}
                  checked={q.skip !== false}
                  onChange={(e) => setQuestion(i, { skip: e.target.checked })}
                />
                Skip question
              </label>
            </div>
          </div>
        ))}
        {!locked && draft.questions.length < 10 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set('questions', [...draft.questions, { text: '', answers: ['Yes', 'No'], skip: true }])}
          >
            Add question
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded border border-rune-red/40 bg-rune-red/10 px-3 py-2 text-sm text-parchment">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => onClose(false)} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save poll'}
        </Button>
      </div>
    </div>
  )
}

function Results({ poll }: { poll: Poll }) {
  if (!poll.results) return null

  return (
    <ul className="mt-2 space-y-1 text-xs text-text-secondary">
      {poll.questions.map((q, i) => {
        const r = poll.results!.questions[i]
        return (
          <li key={i}>
            <span className="text-text-primary">{q.text}</span>{' '}
            {q.answers.map((a, j) => `${a} ${r.percents[j]}% (${r.counts[j]})`).join(' · ')} · skipped {r.skipped}
            {r.passed !== null && (
              <span className={r.passed ? ' text-moss' : ' text-ember'}>{r.passed ? ' · passed' : ' · failed'}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function PollManagement() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [editing, setEditing] = useState<{ poll: Poll | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      setPolls((await getAdminPolls()).polls ?? [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The polls could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const remove = async (poll: Poll) => {
    if (!window.confirm(`Delete "${poll.title}"? It has not opened yet.`)) return

    try {
      await deletePoll(poll.id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The poll could not be deleted.')
    }
  }

  return (
    <section className="rounded-lg border border-stone-700 bg-stone-800/60">
      <header className="flex flex-col gap-4 border-b border-stone-700 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-adventure text-lg uppercase tracking-wide text-gold-400">Polls</h2>
          <p className="mt-1 text-xs text-text-secondary">
            Players vote at the poll booths in game, one ballot per account. Results stay hidden until a poll closes; a
            Yes question passes on 70% of the answers that were not skips.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setEditing({ poll: null })} disabled={editing !== null}>
          New poll
        </Button>
      </header>

      {error && <p className="border-b border-stone-700 bg-rune-red/10 px-5 py-3 text-sm text-parchment">{error}</p>}

      {editing && (
        <PollEditor
          key={editing.poll?.id ?? 'new'}
          poll={editing.poll}
          onClose={(saved) => {
            setEditing(null)
            if (saved) load()
          }}
        />
      )}

      {loading ? (
        <p className="px-5 py-10 text-center text-sm text-text-secondary">Loading polls…</p>
      ) : polls.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-text-secondary">No polls yet.</p>
      ) : (
        <ul className="divide-y divide-stone-800">
          {polls.map((poll) => (
            <li key={poll.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded border px-2 py-0.5 text-[10px] uppercase tracking-wide ${STATE_STYLE[poll.state]}`}
                  >
                    {poll.state}
                  </span>
                  <a
                    href={pollPath(poll)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gold-400 hover:text-gold-500"
                  >
                    {poll.title}
                  </a>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  {POLL_KINDS.find((k) => k.value === poll.kind)?.label} ·{' '}
                  {new Date(poll.opensAt * 1000).toLocaleString()} – {new Date(poll.closesAt * 1000).toLocaleString()} ·{' '}
                  {poll.questions.length} question
                  {poll.questions.length === 1 ? '' : 's'}
                  {poll.ballots !== undefined && ` · ${poll.ballots} ballot${poll.ballots === 1 ? '' : 's'} so far`}
                  {poll.results && ` · ${poll.results.ballots} ballots`}
                </p>
                <Results poll={poll} />
              </div>
              <div className="flex shrink-0 gap-1">
                {poll.state !== 'closed' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing({ poll })}
                    disabled={editing !== null}
                  >
                    Edit
                  </Button>
                )}
                {poll.state === 'scheduled' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(poll)}
                    disabled={editing !== null}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
