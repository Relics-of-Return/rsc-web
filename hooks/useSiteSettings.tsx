'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

import type { SiteSettings } from '@/lib/types'

interface SiteSettingsContextValue {
  settings: SiteSettings
  /** Shows settings the admin section just saved, without a reload. */
  setSettings: (settings: SiteSettings) => void
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | null>(null)

/**
 * The site's settings, read by the server as the page is rendered (so the
 * right logo is there from the first paint) and handed down from there.
 */
export function SiteSettingsProvider({
  initial,
  children,
}: {
  initial: SiteSettings
  children: ReactNode
}) {
  const [settings, setSettings] = useState(initial)
  const value = useMemo(() => ({ settings, setSettings }), [settings])

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>
}

export function useSiteSettings(): SiteSettingsContextValue {
  const ctx = useContext(SiteSettingsContext)

  if (!ctx) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider')
  }

  return ctx
}
