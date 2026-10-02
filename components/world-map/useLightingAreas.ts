'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchJson } from '@/components/world-map/useWorldEdits'
import type { AreaRect, LightingArea } from '@/lib/landscape/lighting'

/**
 * HD graphics' lighting areas as the editor holds them: loaded the first
 * time they're wanted, changed here, and written back with save() — on
 * their own, apart from the world's Save, since they live in the client's
 * files rather than the server's.
 */
export interface LightingAreas {
  /** null until loaded. */
  areas: LightingArea[] | null
  selected: number | null
  select: (index: number | null) => void
  dirty: boolean
  busy: boolean
  message: { kind: 'ok' | 'error'; text: string } | null
  change: (index: number, patch: Partial<LightingArea>) => void
  /** The selected area's rectangle, on the plane it's drawn on. */
  place: (index: number, rect: AreaRect, plane: number) => void
  add: (plane: number, rect: AreaRect | null) => void
  remove: (index: number) => void
  /** Moves an area earlier (-1) or later (1): the first that matches wins. */
  move: (index: number, by: -1 | 1) => void
  save: () => Promise<void>
  revert: () => Promise<void>
}

export function useLightingAreas(wanted: boolean): LightingAreas {
  const [areas, setAreas] = useState<LightingArea[] | null>(null)
  const [version, setVersion] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<LightingAreas['message']>(null)

  const loaded = useCallback((next: { areas: LightingArea[]; version: string }) => {
    setAreas(next.areas)
    setVersion(next.version)
    setDirty(false)
    setMessage(null)
    setSelected((current) => (current !== null && current < next.areas.length ? current : null))
  }, [])

  const failed = useCallback((error: unknown) => {
    setMessage({
      kind: 'error',
      text: error instanceof Error ? error.message : 'could not load the lighting areas',
    })
  }, [])

  const read = () => fetchJson<{ areas: LightingArea[]; version: string }>('/api/landscape/lighting')

  // read again, throwing away anything not saved
  const load = useCallback(async () => {
    setBusy(true)

    try {
      loaded(await read())
    } catch (error) {
      failed(error)
    } finally {
      setBusy(false)
    }
  }, [loaded, failed])

  // the first time they're wanted
  const requested = useRef(false)

  useEffect(() => {
    if (!wanted || requested.current) {
      return
    }

    requested.current = true
    read().then(loaded, failed)
  }, [wanted, loaded, failed])

  const edit = useCallback((next: (current: LightingArea[]) => LightingArea[]) => {
    setAreas((current) => (current ? next(current) : current))
    setDirty(true)
    setMessage(null)
  }, [])

  const change = useCallback(
    (index: number, patch: Partial<LightingArea>) =>
      edit((current) =>
        current.map((area, i) => {
          if (i !== index) {
            return area
          }

          const next = { ...area, ...patch }

          // a field set back to nothing is left out of the file
          for (const key of Object.keys(patch) as (keyof LightingArea)[]) {
            if (patch[key] === undefined) {
              delete next[key]
            }
          }

          return next
        }),
      ),
    [edit],
  )

  const place = useCallback(
    (index: number, rect: AreaRect, plane: number) =>
      change(index, {
        plane,
        x: [rect.x, rect.x + rect.width - 1],
        y: [rect.y, rect.y + rect.height - 1],
      }),
    [change],
  )

  const add = useCallback(
    (plane: number, rect: AreaRect | null) => {
      if (!areas) {
        return
      }

      const area: LightingArea = { name: `New area ${areas.length + 1}`, plane }

      if (rect) {
        area.x = [rect.x, rect.x + rect.width - 1]
        area.y = [rect.y, rect.y + rect.height - 1]
      }

      edit((current) => [...current, area])
      setSelected(areas.length)
    },
    [areas, edit],
  )

  const remove = useCallback(
    (index: number) => {
      edit((current) => current.filter((_, i) => i !== index))
      setSelected(null)
    },
    [edit],
  )

  const move = useCallback(
    (index: number, by: -1 | 1) => {
      edit((current) => {
        const to = index + by

        if (to < 0 || to >= current.length) {
          return current
        }

        const next = [...current]

        ;[next[index], next[to]] = [next[to], next[index]]

        return next
      })
      setSelected((current) => (current === index ? index + by : current))
    },
    [edit],
  )

  const save = useCallback(async () => {
    if (!areas || !version) {
      return
    }

    setBusy(true)

    try {
      const saved = await fetchJson<{ areas: LightingArea[]; version: string }>(
        '/api/landscape/lighting',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ areas, version }),
        },
      )

      setAreas(saved.areas)
      setVersion(saved.version)
      setDirty(false)
      setMessage({
        kind: 'ok',
        text: 'Saved. The game uses them from its next build (npm run build-dev in rsc-client).',
      })
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : 'could not save the lighting areas',
      })
    } finally {
      setBusy(false)
    }
  }, [areas, version])

  return {
    areas,
    selected,
    select: setSelected,
    dirty,
    busy,
    message,
    change,
    place,
    add,
    remove,
    move,
    save,
    revert: load,
  }
}
