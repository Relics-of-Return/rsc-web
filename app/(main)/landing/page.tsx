import type { Metadata } from 'next'

import { LandingShowcase } from '@/components/landing/LandingShowcase'
import {
  DEMO_NEWS,
  DEMO_STATUS,
  DEMO_TICKER_ITEMS,
  DEMO_TOP_RANKS,
  DEMO_WORLDS,
  type LandingConceptId,
  type LandingPageData,
} from '@/components/landing/types'
import type {
  HiscoresData,
  NewsListData,
  ServerStatusData,
  WorldsData,
} from '@/lib/types'
import { landingFontVariables } from '@/lib/fonts'
import { fetchWwwJson } from '@/lib/www'

export const metadata: Metadata = {
  title: 'Landing Page Showcase',
  description:
    'Interactive landing page concepts for Relics of Return — compare The Obsidian Keep, The Varrock Gazette, and the 2003 Arcade Terminal.',
}

interface LandingPageProps {
  searchParams: Promise<{ concept?: string }>
}

function parseConcept(value?: string): LandingConceptId {
  if (
    value === 'unified' ||
    value === 'osrs' ||
    value === 'obsidian' ||
    value === 'gazette' ||
    value === 'arcade'
  ) {
    return value
  }
  return 'unified'
}

async function getLandingData(): Promise<LandingPageData> {
  const [statusRes, worldsRes, newsRes, hiscoresRes] = await Promise.all([
    fetchWwwJson<ServerStatusData>('/api/status').catch(() => null),
    fetchWwwJson<WorldsData>('/api/worlds').catch(() => null),
    fetchWwwJson<NewsListData>('/api/news?page=0').catch(() => null),
    fetchWwwJson<HiscoresData>('/api/hiscores?skill=overall&page=0').catch(() => null),
  ])

  const hasLive =
    Boolean(statusRes?.connected) ||
    Boolean(worldsRes?.worlds?.length) ||
    Boolean(newsRes?.articles?.length)

  return {
    status: statusRes ?? DEMO_STATUS,
    worlds: worldsRes?.worlds?.length ? worldsRes.worlds : DEMO_WORLDS,
    news: newsRes?.articles?.length ? newsRes.articles.slice(0, 4) : DEMO_NEWS,
    topRanks: hiscoresRes?.ranks?.length ? hiscoresRes.ranks.slice(0, 6) : DEMO_TOP_RANKS,
    tickerItems: DEMO_TICKER_ITEMS,
    isLiveBackend: hasLive,
  }
}

export default async function LandingExamplePage({ searchParams }: LandingPageProps) {
  const { concept } = await searchParams
  const data = await getLandingData()

  return (
    <div className={landingFontVariables}>
      <LandingShowcase initialData={data} initialConcept={parseConcept(concept)} />
    </div>
  )
}
