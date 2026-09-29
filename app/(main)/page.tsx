import Link from 'next/link'

import { HeroSection } from '@/components/sections/HeroSection'
import { StatusStrip } from '@/components/sections/StatusStrip'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { Container } from '@/components/ui/Container'
import { newsCategoryLabel } from '@/data/news'
import type { NewsListData } from '@/lib/types'
import { formatUnixDate } from '@/lib/utils'
import { fetchWwwJson } from '@/lib/www'

const features = [
  {
    title: 'Play In Your Browser',
    description:
      'No downloads required. The classic client runs straight from your browser over WebSocket — log in and you are in Lumbridge within seconds.',
    href: '/play',
    cta: 'Launch Client',
  },
  {
    title: 'Full Hiscores',
    description:
      'All 18 skills plus overall rankings, live from the game server. Track your progress and climb the ranks, or look up any adventurer.',
    href: '/hiscores',
    cta: 'View Hiscores',
  },
  {
    title: 'Live World Status',
    description:
      'Real-time player counts, registered accounts and world availability, straight from the Relics of Return data server.',
    href: '/status',
    cta: 'Server Status',
  },
]

async function getLatestNews() {
  try {
    const data = await fetchWwwJson<NewsListData>('/api/news?page=0')
    return data.articles.slice(0, 3)
  } catch {
    return []
  }
}

export default async function HomePage() {
  const latestNews = await getLatestNews()

  return (
    <>
      <HeroSection />
      <StatusStrip />

      <section className="py-20 bg-stone-900/50">
        <Container>
          <SectionTitle
            eyebrow="Why Relics of Return"
            title="Classic adventure, modern polish"
            description="Everything you remember about 2003, rebuilt and running on an open-source server you can host yourself."
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="group flex flex-col rounded-lg border border-stone-700 bg-stone-800/60 p-6 transition-all duration-200 hover:border-gold-500/50 hover:bg-stone-800"
              >
                <h3 className="font-adventure text-xl text-gold-400 uppercase tracking-wide">
                  {feature.title}
                </h3>
                <p className="mt-3 flex-1 text-sm text-text-secondary leading-relaxed">
                  {feature.description}
                </p>
                <Link
                  href={feature.href}
                  className="mt-5 text-sm font-medium text-gold-400 transition-colors group-hover:text-gold-500"
                >
                  {feature.cta} &rarr;
                </Link>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <SectionTitle
            eyebrow="Updates"
            title="Latest News"
            description="What has been happening across the Relics of Return stack."
          />

          {latestNews.length > 0 ? (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              {latestNews.map((article) => (
                <article
                  key={article.id}
                  className="group flex flex-col rounded-lg border border-stone-700 bg-stone-800/60 p-6 transition-all duration-200 hover:border-gold-500/50 hover:bg-stone-800"
                >
                  <div className="flex items-center gap-3 text-xs">
                    <span className="rounded bg-gold-500/10 px-2 py-0.5 font-medium uppercase tracking-wide text-gold-400">
                      {newsCategoryLabel(article.category)}
                    </span>
                    <time className="text-text-muted" dateTime={new Date(article.date * 1000).toISOString()}>
                      {formatUnixDate(article.date)}
                    </time>
                  </div>

                  <h3 className="mt-3 font-adventure text-xl text-gold-400 uppercase tracking-wide">
                    <Link href={`/news/${article.id}`} className="transition-colors group-hover:text-gold-500">
                      {article.title}
                    </Link>
                  </h3>

                  <p className="mt-3 flex-1 text-sm text-text-secondary leading-relaxed line-clamp-3">
                    {article.summary}
                  </p>

                  <Link
                    href={`/news/${article.id}`}
                    className="mt-5 text-sm font-medium text-gold-400 transition-colors group-hover:text-gold-500"
                  >
                    Read more &rarr;
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-12 text-center text-text-secondary">
              No news has been posted yet.
            </p>
          )}

          <div className="mt-10 text-center">
            <Link
              href="/news"
              className="text-sm font-medium text-gold-400 hover:text-gold-500 transition-colors"
            >
              View all news &rarr;
            </Link>
          </div>
        </Container>
      </section>
    </>
  )
}
