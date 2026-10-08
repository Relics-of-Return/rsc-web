'use client'

import { useEffect, useState } from 'react'
import { LayoutDashboard, Link2, LogOut, ShieldCheck, Swords } from 'lucide-react'

import { BetaAccessCard } from '@/components/account/BetaAccessCard'
import type { AccountPageData } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CharacterPanel } from './CharacterPanel'
import { OverviewPanel, type AccountTab } from './OverviewPanel'
import { Panel } from './parts'
import { ProfileBanner } from './ProfileBanner'
import { SecurityPanel } from './SecurityPanel'

const TABS: { id: AccountTab; label: string; Icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'character', label: 'Character', Icon: Swords },
  { id: 'security', label: 'Security', Icon: ShieldCheck },
  { id: 'linked', label: 'Linked accounts', Icon: Link2 },
]

function tabFromLocation(): AccountTab {
  // Discord sends players back here with ?discord=…, which the linked tab reads
  if (new URLSearchParams(window.location.search).has('discord')) return 'linked'
  const hash = window.location.hash.slice(1)
  return TABS.some((tab) => tab.id === hash) ? (hash as AccountTab) : 'overview'
}

export function AccountHub({ data, onLogout }: { data: AccountPageData; onLogout: () => void }) {
  // only ever drawn in the browser, once the account has loaded
  const [tab, setTab] = useState<AccountTab>(tabFromLocation)
  const home = data.worlds.find((world) => world.id === 1) ?? data.worlds[0]
  const [worldId, setWorldId] = useState(home?.id ?? 1)

  useEffect(() => {
    const sync = () => setTab(tabFromLocation())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const open = (next: AccountTab) => {
    setTab(next)
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${next}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-6">
      <ProfileBanner data={data} home={home} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Account" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div role="tablist" aria-orientation="vertical" className="flex gap-1 overflow-x-auto rounded-lg border border-stone-700 bg-stone-800/60 p-1.5 lg:flex-col">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`account-tab-${id}`}
                aria-selected={tab === id}
                aria-controls="account-panel"
                onClick={() => open(id)}
                className={cn(
                  'flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                  tab === id ? 'bg-gold-500/15 text-gold-400 shadow-[inset_3px_0_0] shadow-gold-500' : 'text-text-secondary hover:bg-stone-900/60 hover:text-text-primary'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
            <span className="mx-1 hidden h-px bg-stone-700 lg:my-1 lg:block" />
            <button
              type="button"
              onClick={onLogout}
              className="flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm text-text-secondary transition-colors hover:bg-rune-red/15 hover:text-red-400"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Log out
            </button>
          </div>
        </nav>

        <div id="account-panel" role="tabpanel" aria-labelledby={`account-tab-${tab}`} className="min-w-0">
          {tab === 'overview' && <OverviewPanel data={data} home={home} onTab={open} />}
          {tab === 'character' && (
            <CharacterPanel worlds={data.worlds} selected={data.worlds.find((world) => world.id === worldId) ?? home} onSelect={setWorldId} username={data.username} />
          )}
          {tab === 'security' && <SecurityPanel username={data.username} worlds={data.worlds} />}
          {tab === 'linked' && (
            <Panel title="Linked accounts" description="Accounts elsewhere that this one is linked to.">
              <BetaAccessCard className="" />
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
