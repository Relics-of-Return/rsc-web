'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

/**
 * Switches between the two world maps. The worlds run separate databases, so
 * these are genuinely two maps rather than one map filtered two ways — the
 * colour of each tab matches the markers on the map it leads to.
 */
const MAPS = [
  {
    href: '/map',
    label: 'World 1',
    note: 'No botting',
    active: 'border-gold-500 bg-stone-800 text-gold-400',
  },
  {
    href: '/map/world-2',
    label: 'World 2',
    note: 'Botting allowed',
    active: 'border-moss bg-stone-800 text-moss',
  },
]

export function WorldMapTabs() {
  const pathname = usePathname()

  return (
    <nav
      className="flex flex-wrap justify-center gap-2"
      aria-label="Choose a world map"
    >
      {MAPS.map((map) => {
        const isActive = pathname === map.href

        return (
          <Link
            key={map.href}
            href={map.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex items-baseline gap-2 rounded-md border px-4 py-2 text-sm transition-colors',
              isActive
                ? map.active
                : 'border-stone-700 bg-stone-900 text-text-secondary hover:border-stone-600 hover:text-text-primary',
            )}
          >
            <span className="font-adventure uppercase tracking-wide">
              {map.label}
            </span>
            <span className="text-xs text-text-muted">{map.note}</span>
          </Link>
        )
      })}
    </nav>
  )
}
