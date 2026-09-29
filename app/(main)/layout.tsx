import type { ReactNode } from 'react'

import { Footer } from '@/components/layout/Footer'
import { MainNav } from '@/components/layout/MainNav'
import { UtilityBar } from '@/components/layout/UtilityBar'
import { SiteSettingsProvider } from '@/hooks/useSiteSettings'
import { readSiteSettings } from '@/lib/site-settings'

export default async function MainLayout({ children }: { children: ReactNode }) {
  const settings = await readSiteSettings()

  return (
    <SiteSettingsProvider initial={settings}>
      <UtilityBar />
      <MainNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </SiteSettingsProvider>
  )
}
