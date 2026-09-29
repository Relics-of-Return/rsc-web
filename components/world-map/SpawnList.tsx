'use client'

import type { ItemSpawn, NpcSpawn } from '@/lib/landscape/types'

/**
 * The NPCs or ground items that spawn on the selected tile, each editable in
 * place. New ones are put down with the NPC and item tools.
 */

const FIELD =
  'w-full rounded border border-stone-700 bg-stone-900 px-2 py-1 text-sm text-text-primary'
const LABEL = 'text-[11px] uppercase tracking-wide text-text-secondary'

function NumberField({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string
  value: number
  min?: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block space-y-0.5">
      <span className={LABEL}>{label}</span>
      <input
        type="number"
        className={FIELD}
        min={min}
        value={value}
        onChange={(e) => {
          const next = Number.parseInt(e.target.value, 10)

          if (Number.isFinite(next) && next >= min) {
            onChange(next)
          }
        }}
      />
    </label>
  )
}

interface NpcListProps {
  names: Record<string, string>
  entries: NpcSpawn[]
  onChange: (entries: NpcSpawn[]) => void
}

export function NpcList({ names, entries, onChange }: NpcListProps) {
  const set = (index: number, patch: Partial<NpcSpawn>) =>
    onChange(entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)))

  if (!entries.length) {
    return (
      <p className="text-sm text-text-secondary">
        No NPC spawns here. Pick one with the NPC tool (7) and click the map.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {entries.map((npc, index) => {
        const radius = Math.max(npc.x - npc.minX, npc.maxX - npc.x, npc.y - npc.minY, npc.maxY - npc.y)
        const outside =
          npc.x < npc.minX || npc.x > npc.maxX || npc.y < npc.minY || npc.y > npc.maxY

        return (
          <li key={index} className="space-y-2 rounded border border-stone-700 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-text-primary">
                {names[String(npc.id)] ?? 'Unknown'}{' '}
                <span className="text-text-secondary">#{npc.id}</span>
              </span>
              <button
                type="button"
                className="text-xs text-red-300 underline"
                onClick={() => onChange(entries.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>

            <NumberField
              label="NPC id"
              value={npc.id}
              onChange={(id) => (id in names ? set(index, { id }) : undefined)}
            />

            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Wander west to x" value={npc.maxX} onChange={(maxX) => set(index, { maxX })} />
              <NumberField label="east to x" value={npc.minX} onChange={(minX) => set(index, { minX })} />
              <NumberField label="north to y" value={npc.minY} onChange={(minY) => set(index, { minY })} />
              <NumberField label="south to y" value={npc.maxY} onChange={(maxY) => set(index, { maxY })} />
            </div>

            <div className="flex flex-wrap gap-1 text-[11px]">
              <span className="text-text-secondary">Wander box:</span>
              {[0, 2, 5, 10, 20].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={
                    'rounded border px-1.5 ' +
                    (r === radius && !outside
                      ? 'border-gold-500 text-gold-400'
                      : 'border-stone-700 text-text-secondary hover:text-text-primary')
                  }
                  onClick={() =>
                    set(index, {
                      minX: npc.x - r,
                      maxX: npc.x + r,
                      minY: npc.y - r,
                      maxY: npc.y + r,
                    })
                  }
                >
                  ±{r}
                </button>
              ))}
            </div>

            {(npc.minX > npc.maxX || npc.minY > npc.maxY) && (
              <p className="text-[11px] text-red-300">The box is inside out; it cannot be saved like this.</p>
            )}
            {outside && (
              <p className="text-[11px] text-amber-300">
                The spawn point is outside its own wander box.
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

interface ItemListProps {
  names: Record<string, string>
  entries: ItemSpawn[]
  onChange: (entries: ItemSpawn[]) => void
}

export function ItemList({ names, entries, onChange }: ItemListProps) {
  const set = (index: number, patch: Partial<ItemSpawn>) =>
    onChange(entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)))

  if (!entries.length) {
    return (
      <p className="text-sm text-text-secondary">
        No items lie here. Pick one with the item tool (8) and click the map.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {entries.map((item, index) => (
        <li key={index} className="space-y-2 rounded border border-stone-700 p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-text-primary">
              {names[String(item.id)] ?? 'Unknown'}{' '}
              <span className="text-text-secondary">#{item.id}</span>
            </span>
            <button
              type="button"
              className="text-xs text-red-300 underline"
              onClick={() => onChange(entries.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>

          <NumberField
            label="Item id"
            value={item.id}
            onChange={(id) => (id in names ? set(index, { id }) : undefined)}
          />

          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Amount"
              value={item.amount ?? 1}
              min={1}
              onChange={(amount) => {
                // the shipped file only writes an amount for stacks
                const next = { ...item }

                if (amount > 1) {
                  next.amount = amount
                } else {
                  delete next.amount
                }

                onChange(entries.map((entry, i) => (i === index ? next : entry)))
              }}
            />
            <NumberField
              label="Respawn (s)"
              value={Math.round(item.respawn / 1000)}
              onChange={(seconds) => set(index, { respawn: seconds * 1000 })}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
