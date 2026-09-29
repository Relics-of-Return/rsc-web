'use client'

import { useEffect, useState } from 'react'

import { getServerStatus } from '@/lib/api'

interface UptimeTimerProps {
  className?: string
}

export function UptimeTimer({ className }: UptimeTimerProps) {
  const [uptime, setUptime] = useState<number | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setError(null)
        const data = await getServerStatus()
        setStartedAt(data.startedAt ?? null)

        // Calculate uptime immediately
        if (data.startedAt) {
          const now = Date.now() / 1000
          setUptime(now - data.startedAt)
        }
      } catch {
        setError('Unable to fetch server uptime')
      }
    }

    fetchStatus()
  }, [])

  // Live countdown, re-anchored whenever the start time changes.
  useEffect(() => {
    if (startedAt === null) return

    const tick = () => setUptime(Date.now() / 1000 - startedAt)
    tick()

    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    const parts: string[] = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    parts.push(`${secs}s`)

    return parts.join(' ')
  }

  if (error) {
    return (
      <p className={`text-sm text-text-muted ${className || ''}`}>
        {error}
      </p>
    )
  }

  if (uptime === null) {
    return (
      <p className={`text-sm text-text-muted ${className || ''}`}>
        Loading...
      </p>
    )
  }

  return (
    <div className={className}>
      <p className="text-sm text-text-muted">Server uptime</p>
      <p className="font-mono text-gold-400">{formatUptime(uptime)}</p>
    </div>
  )
}