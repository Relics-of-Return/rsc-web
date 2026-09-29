'use client'

import { useCallback, useEffect, useState } from 'react'

import { getServerStatus } from '@/lib/api'
import type { ServerStatusData } from '@/lib/types'

/** Polls the server status every 30 seconds. */
export function useServerStatus() {
  const [status, setStatus] = useState<ServerStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      setError(null)
      const data = await getServerStatus()
      setStatus(data)
    } catch (err) {
      setError('Failed to fetch server status')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  return { status, loading, error, refetch: fetchStatus }
}
