'use client'

import Link from 'next/link'
import { useState } from 'react'

import { AbuseReports } from '@/components/admin/AbuseReports'
import { CommandLog } from '@/components/admin/CommandLog'
import { GuideManagement } from '@/components/admin/GuideManagement'
import { NewsManagement } from '@/components/admin/NewsManagement'
import { SiteSettings } from '@/components/admin/SiteSettings'
import { Crown } from '@/components/players/Crown'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { isAdministrator, isStaff, staffRankName } from '@/data/ranks'
import { useAuth } from '@/hooks/useAuth'
import { canEditWorld } from '@/lib/landscape/access'
import { formatUsername } from '@/lib/utils'

/**
 * The administrative section. Gated on the staff rank carried by the session
 * — but the gate here only decides what to draw: rsc-www checks the same rank
 * on every /api/admin request, so a player who forces this page open still
 * gets nothing back.
 */
export default function AdminPage() {
  const { user, rank, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<
    'reports' | 'logs' | 'news' | 'guides' | 'settings'
  >('reports')

  if (loading) {
    return (
      <Container className="py-16">
        <p className="text-center text-sm text-text-secondary">Loading…</p>
      </Container>
    )
  }

  if (!user) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-lg rounded-lg border border-stone-700 bg-stone-800/60 p-8 text-center">
          <h1 className="font-adventure text-2xl uppercase tracking-wide text-gold-500">
            Staff Only
          </h1>
          <p className="mt-4 text-sm text-text-secondary">
            Log in with a staff account to reach the administrative section.
          </p>
          <div className="mt-6 flex justify-center">
            <Button asChild>
              <Link href="/login">Log In</Link>
            </Button>
          </div>
        </div>
      </Container>
    )
  }

  if (!isStaff(rank)) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-lg rounded-lg border border-stone-700 bg-stone-800/60 p-8 text-center">
          <h1 className="font-adventure text-2xl uppercase tracking-wide text-gold-500">
            Staff Only
          </h1>
          <p className="mt-4 text-sm text-text-secondary">
            The account <span className="text-gold-400">{formatUsername(user)}</span> does not
            hold a staff rank, so there is nothing here for you.
          </p>
          <div className="mt-6 flex justify-center">
            <Button asChild variant="outline">
              <Link href="/">Back to the site</Link>
            </Button>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container className="py-16">
      <SectionTitle
        eyebrow="Administration"
        title="Staff Tools"
        align="left"
        description="Moderation tools for the game server. Everything here is visible to staff accounts only."
      />

      <p className="mt-4 inline-flex items-center gap-2 text-sm text-text-secondary">
        Signed in as
        <span className="inline-flex items-center gap-1.5 text-gold-400">
          <Crown rank={rank} className="h-[22px] w-[26px]" />
          {formatUsername(user)}
        </span>
        <span className="text-text-muted">({staffRankName(rank)})</span>
      </p>

      {canEditWorld(rank) && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/map/edit">Open the world editor</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/models/edit">Open the model editor</Link>
          </Button>
        </div>
      )}

      <div className="mt-10">
        <div className="overflow-x-auto border-b border-stone-700" role="tablist" aria-label="Administration tools">
          <div className="flex min-w-max gap-1">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'reports'}
              aria-controls="admin-panel-reports"
              onClick={() => setActiveTab('reports')}
              className={tabClass(activeTab === 'reports')}
            >
              Abuse Reports
            </button>
            {isAdministrator(rank) && (
              <>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'logs'}
                  aria-controls="admin-panel-logs"
                  onClick={() => setActiveTab('logs')}
                  className={tabClass(activeTab === 'logs')}
                >
                  Command Log
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'news'}
                  aria-controls="admin-panel-news"
                  onClick={() => setActiveTab('news')}
                  className={tabClass(activeTab === 'news')}
                >
                  News Management
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'guides'}
                  aria-controls="admin-panel-guides"
                  onClick={() => setActiveTab('guides')}
                  className={tabClass(activeTab === 'guides')}
                >
                  Guide Management
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'settings'}
                  aria-controls="admin-panel-settings"
                  onClick={() => setActiveTab('settings')}
                  className={tabClass(activeTab === 'settings')}
                >
                  Site Settings
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-6">
          {activeTab === 'reports' && (
            <div id="admin-panel-reports" role="tabpanel" aria-label="Abuse Reports">
              <AbuseReports />
            </div>
          )}
          {activeTab === 'logs' && isAdministrator(rank) && (
            <div id="admin-panel-logs" role="tabpanel" aria-label="Command Log">
              <CommandLog />
            </div>
          )}
          {activeTab === 'news' && isAdministrator(rank) && (
            <div id="admin-panel-news" role="tabpanel" aria-label="News Management">
              <NewsManagement />
            </div>
          )}
          {activeTab === 'guides' && isAdministrator(rank) && (
            <div id="admin-panel-guides" role="tabpanel" aria-label="Guide Management">
              <GuideManagement />
            </div>
          )}
          {activeTab === 'settings' && isAdministrator(rank) && (
            <div id="admin-panel-settings" role="tabpanel" aria-label="Site Settings">
              <SiteSettings />
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}

function tabClass(selected: boolean): string {
  return selected
    ? 'border-b-2 border-gold-500 px-4 py-3 text-sm font-medium uppercase tracking-wide text-gold-400'
    : 'border-b-2 border-transparent px-4 py-3 text-sm font-medium uppercase tracking-wide text-text-secondary transition-colors hover:border-stone-500 hover:text-gold-400'
}
