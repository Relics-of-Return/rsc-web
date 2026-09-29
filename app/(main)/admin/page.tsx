'use client'

import Link from 'next/link'

import { AbuseReports } from '@/components/admin/AbuseReports'
import { SiteSettings } from '@/components/admin/SiteSettings'
import { Crown } from '@/components/players/Crown'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { isAdministrator, isStaff, staffRankName } from '@/data/ranks'
import { useAuth } from '@/hooks/useAuth'
import { canEditWorld } from '@/lib/landscape/access'

/**
 * The administrative section. Gated on the staff rank carried by the session
 * — but the gate here only decides what to draw: rsc-www checks the same rank
 * on every /api/admin request, so a player who forces this page open still
 * gets nothing back.
 */
export default function AdminPage() {
  const { user, rank, loading } = useAuth()

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
            The account <span className="text-gold-400">{user}</span> does not
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
          {user}
        </span>
        <span className="text-text-muted">({staffRankName(rank)})</span>
      </p>

      {canEditWorld(rank) && (
        <div className="mt-6">
          <Button asChild variant="outline" size="sm">
            <Link href="/map/edit">Open the world editor</Link>
          </Button>
        </div>
      )}

      {isAdministrator(rank) && (
        <div className="mt-10">
          <SiteSettings />
        </div>
      )}

      <div className="mt-10">
        <AbuseReports />
      </div>
    </Container>
  )
}
