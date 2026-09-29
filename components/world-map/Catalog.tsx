'use client'

import { useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * A searchable list of everything of one kind the world can hold — scenery,
 * doors, walls, NPCs, items — to pick the one a tool puts down. Scenery,
 * doors and walls show the game's own model, drawn by the 3D view's
 * renderer; the rest are names.
 *
 * Search by name, or by `#id`.
 */

interface CatalogProps {
  /** What the list is of, for its label: "scenery", "NPCs". */
  label: string
  /** id -> name. */
  names: Record<string, string>
  selected: number | null
  onPick: (id: number | null) => void
  /** A picture of the model, once the renderer is ready. */
  thumbnail?: ((id: number) => string | null) | null
  /** How many to show at once; searching narrows it. */
  limit?: number
}

/** One model picture, drawn a moment after it scrolls into the list. */
function Thumb({ id, thumbnail }: { id: number; thumbnail: (id: number) => string | null }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    // after paint, so a long list appears at once and fills in
    const timer = setTimeout(() => setUrl(thumbnail(id)), 0)

    return () => clearTimeout(timer)
  }, [id, thumbnail])

  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- a data: url drawn in the browser
    <img src={url} alt="" className="h-14 w-14 rounded bg-stone-950" style={{ imageRendering: 'pixelated' }} />
  ) : (
    <span className="h-14 w-14 animate-pulse rounded bg-stone-800" />
  )
}

export function Catalog({ label, names, selected, onPick, thumbnail, limit = 48 }: CatalogProps) {
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const text = query.trim().toLowerCase()
    const byId = /^#?(\d+)$/.exec(text)
    const entries = Object.entries(names).map(([id, name]) => ({ id: Number(id), name }))

    if (byId) {
      return entries.filter((entry) => String(entry.id).startsWith(byId[1]))
    }

    return text ? entries.filter((entry) => entry.name.toLowerCase().includes(text)) : entries
  }, [names, query])

  const shown = matches.slice(0, limit)

  return (
    <div className="space-y-2">
      <input
        className="w-full rounded border border-stone-700 bg-stone-900 px-2 py-1 text-sm text-text-primary"
        placeholder={`Search ${label} — name or #id`}
        aria-label={`Search ${label}`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div
        className={cn(
          'max-h-72 overflow-y-auto rounded border border-stone-800 p-1',
          thumbnail ? 'grid grid-cols-3 gap-1' : 'space-y-0.5',
        )}
        role="listbox"
        aria-label={label}
      >
        {shown.map(({ id, name }) => (
          <button
            key={id}
            type="button"
            role="option"
            aria-selected={selected === id}
            title={`${name} #${id}`}
            onClick={() => onPick(selected === id ? null : id)}
            className={cn(
              'rounded text-left text-[11px] leading-tight hover:bg-stone-800',
              thumbnail ? 'flex flex-col items-center gap-1 p-1 text-center' : 'block w-full px-2 py-1',
              selected === id
                ? 'bg-stone-700 text-gold-400 ring-1 ring-gold-500'
                : 'text-text-secondary',
            )}
          >
            {thumbnail && <Thumb id={id} thumbnail={thumbnail} />}
            <span className="line-clamp-2">
              {name} <span className="text-text-secondary/60">#{id}</span>
            </span>
          </button>
        ))}

        {!shown.length && <p className="p-2 text-xs text-text-secondary">Nothing matches.</p>}
      </div>

      {matches.length > shown.length && (
        <p className="text-[11px] text-text-secondary/70">
          {matches.length - shown.length} more — search to narrow it down.
        </p>
      )}
    </div>
  )
}
