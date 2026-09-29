'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { fetchJson } from '@/components/world-map/useWorldEdits'
import { cn } from '@/lib/utils'

/**
 * Sweeps the saved world for likely mistakes (see checkWorld in the store)
 * and lists them; clicking one goes there. Scenery facing two ways at once
 * can be fixed in one go.
 *
 * It checks what is saved, not the working copy: save, then check again.
 */

type IssueKind =
  | 'facing'
  | 'duplicate'
  | 'stacked'
  | 'npc-blocked'
  | 'npc-wander'
  | 'item-in-water'
  | 'no-ground'
  | 'unknown-id'
  | 'legacy-loc'

interface Issue {
  kind: IssueKind
  x: number
  y: number
  text: string
}

const KINDS: Record<IssueKind, string> = {
  facing: 'Scenery facing two ways',
  duplicate: 'Listed twice',
  stacked: 'Scenery sharing a tile',
  'npc-blocked': 'NPCs spawning in walls or water',
  'npc-wander': 'NPCs outside their wander box',
  'item-in-water': 'Items on blocked ground',
  'no-ground': 'Spawns with no ground under them',
  'unknown-id': 'Ids nothing defines',
  'legacy-loc': 'Old .loc scenery nothing draws',
}

interface CheckPanelProps {
  onGo: (at: { x: number; y: number }) => void
  /** Makes each of these tiles face the way its scenery's server copy says. */
  onFixFacing: (at: { x: number; y: number }[]) => Promise<void>
}

export function CheckPanel({ onGo, onFixFacing }: CheckPanelProps) {
  const [result, setResult] = useState<{ counts: Record<IssueKind, number>; issues: Issue[] } | null>(null)
  const [busy, setBusy] = useState<'checking' | 'fixing' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState<IssueKind | null>(null)

  const check = async () => {
    setBusy('checking')
    setError(null)

    try {
      const next = await fetchJson<{ counts: Record<IssueKind, number>; issues: Issue[] }>(
        '/api/landscape/check',
      )

      setResult(next)
      setKind((current) => current ?? (Object.keys(KINDS) as IssueKind[]).find((k) => next.counts[k]) ?? null)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'the check failed')
    } finally {
      setBusy(null)
    }
  }

  const shown = result && kind ? result.issues.filter((issue) => issue.kind === kind) : []

  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" className="w-full" disabled={busy !== null} onClick={check}>
        {busy === 'checking' ? 'Checking the world…' : result ? 'Check again' : 'Check the world'}
      </Button>

      {error && <p className="text-xs text-red-300">{error}</p>}

      {result && (
        <>
          <ul className="space-y-0.5 text-xs">
            {(Object.keys(KINDS) as IssueKind[]).map((k) => (
              <li key={k}>
                <button
                  type="button"
                  disabled={!result.counts[k]}
                  onClick={() => setKind(k)}
                  className={cn(
                    'flex w-full justify-between rounded px-2 py-0.5 text-left disabled:opacity-40',
                    kind === k ? 'bg-stone-700 text-gold-400' : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  <span>{KINDS[k]}</span>
                  <span>{result.counts[k]}</span>
                </button>
              </li>
            ))}
          </ul>

          {kind === 'facing' && result.counts.facing > 0 && (
            <Button
              size="sm"
              className="w-full"
              disabled={busy !== null}
              onClick={async () => {
                setBusy('fixing')

                try {
                  await onFixFacing(shown.map(({ x, y }) => ({ x, y })))
                } catch (failure) {
                  setError(failure instanceof Error ? failure.message : 'could not fix them')
                } finally {
                  setBusy(null)
                }
              }}
            >
              {busy === 'fixing'
                ? 'Fixing…'
                : `Make all ${shown.length} face the server's way (unsaved)`}
            </Button>
          )}

          <ul className="max-h-64 space-y-0.5 overflow-y-auto rounded border border-stone-800 p-1 text-[11px]">
            {shown.map((issue, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => onGo(issue)}
                  className="w-full rounded px-1.5 py-0.5 text-left text-text-secondary hover:bg-stone-800 hover:text-text-primary"
                >
                  <span className="text-text-primary">
                    {issue.x}, {issue.y}
                  </span>{' '}
                  {issue.text}
                </button>
              </li>
            ))}
          </ul>

          {kind && result.counts[kind] > shown.length && (
            <p className="text-[11px] text-text-secondary/70">
              Showing the first {shown.length} of {result.counts[kind]}.
            </p>
          )}
        </>
      )}
    </div>
  )
}
