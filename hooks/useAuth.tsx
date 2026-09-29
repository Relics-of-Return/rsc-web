'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { getSession, loginAccount, logoutAccount } from '@/lib/api'
import type { LoginResult } from '@/lib/types'

interface AuthContextValue {
  /** Lowercase username when logged in, null otherwise. */
  user: string | null
  /** Staff rank of the logged in player, drawn as a crown (0 = player). */
  rank: number
  loading: boolean
  login: (username: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null)
  const [rank, setRank] = useState(0)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const session = await getSession()
      setUser(session.username)
      setRank(session.rank ?? 0)
    } catch {
      setUser(null)
      setRank(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await loginAccount(username, password)

      if (result.success && result.username) {
        setUser(result.username)
        setRank(result.rank ?? 0)
      }

      return result
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await logoutAccount()
    } finally {
      setUser(null)
      setRank(0)
    }
  }, [])

  const value = useMemo(
    () => ({ user, rank, loading, login, logout, refresh }),
    [user, rank, loading, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return ctx
}
