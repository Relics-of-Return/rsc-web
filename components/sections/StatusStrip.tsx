'use client'

import { Container } from '@/components/ui/Container'
import { useServerStatus } from '@/hooks/useServerStatus'
import { formatNumber } from '@/lib/utils'

export function StatusStrip() {
  const { status, loading, error } = useServerStatus()

  const stats = [
    {
      label: 'Players Online',
      value: loading ? '—' : formatNumber(status?.online),
      hint: error ? 'unavailable' : undefined,
    },
    {
      label: 'Registered Accounts',
      value: loading ? '—' : formatNumber(status?.registered),
      hint: error ? 'unavailable' : undefined,
    },
    {
      label: 'Data Server',
      value: loading ? '—' : status?.connected ? 'Online' : 'Offline',
      hint: undefined,
    },
  ]

  return (
    <section className="border-y border-stone-800 bg-stone-950/80">
      <Container>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-stone-800">
          {stats.map((stat) => (
            <div key={stat.label} className="py-6 sm:py-8 px-4 text-center">
              <p className="font-adventure text-2xl sm:text-3xl text-gold-500">
                {stat.value}
                {stat.hint && (
                  <span className="ml-2 text-xs text-text-muted align-middle">{stat.hint}</span>
                )}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.15em] text-text-muted">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
