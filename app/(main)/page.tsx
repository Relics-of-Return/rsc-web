import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronRight, Newspaper } from 'lucide-react'

import { HeroSection } from '@/components/sections/HeroSection'
import { StatusStrip } from '@/components/sections/EventsStrip'
import { newsCategoryStyle } from '@/data/news'
import { GITHUB_URL } from '@/lib/constants'
import { landingFontVariables } from '@/lib/fonts'
import type { NewsListData, NewsSummaryArticle } from '@/lib/types'
import { cn, formatNewsDate } from '@/lib/utils'
import { fetchWwwJson } from '@/lib/www'

async function getLatestNews() {
  try {
    const data = await fetchWwwJson<NewsListData>('/api/news?page=0')
    return data.articles.slice(0, 4)
  } catch {
    return []
  }
}

export default async function HomePage() {
  const [featured, ...rest] = await getLatestNews()

  return (
    <div className={cn(landingFontVariables, 'bg-[#0d0b08] font-sans-body')}>
      <HeroSection />
      <StatusStrip />

      <section className="relative overflow-hidden bg-[#14110d] py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col justify-between border-b-2 border-[#3c3021] pb-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Newspaper className="h-6 w-6 text-[#f2ca50]" aria-hidden="true" />
              <h2 className="font-adventure text-3xl font-bold tracking-wide text-[#f5ebd9] sm:text-4xl">
                News &amp; Updates
              </h2>
            </div>
            <div className="mt-3 flex items-center gap-4 font-adventure text-xs sm:mt-0 sm:text-sm">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#d0c5af] transition-colors hover:text-[#f2ca50]"
              >
                GitHub
              </a>
              <span className="text-[#3c3021]" aria-hidden="true">
                |
              </span>
              <Link
                href="/news"
                className="text-[#f2ca50] transition-colors hover:text-[#ffe088] hover:underline"
              >
                News Archive
              </Link>
            </div>
          </div>

          {featured ? (
            <>
              <FeaturedStory article={featured} />
              {rest.length > 0 && (
                <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
                  {rest.map((article) => (
                    <StoryCard key={article.id} article={article} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="mb-12 py-10 text-center text-[#d0c5af]">No news has been posted yet.</p>
          )}

          <div className="flex flex-col items-center justify-between gap-6 rounded-sm border border-[#3c3021] bg-[#1b150f] p-6 text-center shadow-lg sm:flex-row sm:text-left">
            <p className="max-w-2xl text-xs leading-relaxed text-[#d0c5af] sm:text-sm">
              Older posts, patch notes and past announcements all live in the news archive.
            </p>
            <Link
              href="/news"
              className="fx-shimmer inline-flex shrink-0 items-center gap-2 rounded-sm border border-[#f2ca50]/50 bg-gradient-to-b from-gold-500 to-[#a88219] px-6 py-2.5 font-adventure text-sm font-bold uppercase tracking-wide text-[#3c2f00] shadow-[0_0_15px_rgba(212,175,55,0.35)] transition-all hover:from-[#e9c349] hover:to-[#bfa02c] hover:shadow-[0_0_24px_rgba(212,175,55,0.6)] active:translate-y-0.5"
            >
              View All News
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function FeaturedStory({ article }: { article: NewsSummaryArticle }) {
  const style = newsCategoryStyle(article.category)

  return (
    <article className="banner-frame group relative mb-12 overflow-hidden rounded-sm bg-[#1b150e] shadow-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="relative min-h-[260px] overflow-hidden border-b border-[#3a2d1d] bg-[#0a0806] lg:col-span-7 lg:min-h-[340px] lg:border-b-0 lg:border-r">
          <Image
            src="/home/update.png"
            alt=""
            fill
            sizes="(min-width: 1024px) 640px, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1b150e] via-transparent to-transparent lg:hidden" />
        </div>

        <div className="flex flex-col justify-between bg-gradient-to-br from-[#1e1710] to-[#15110c] p-6 sm:p-8 lg:col-span-5">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span
                className={cn(
                  'rounded-sm border px-2.5 py-0.5 font-adventure text-xs uppercase tracking-wider shadow-sm',
                  style.borderColor,
                  style.bgColor,
                  style.textColor
                )}
              >
                {style.label}
              </span>
              <time
                className="font-adventure text-xs text-[#d0c5af]/70"
                dateTime={new Date(article.date * 1000).toISOString()}
              >
                {formatNewsDate(article.date)}
              </time>
            </div>
            <h3 className="mb-3 font-adventure text-2xl font-bold leading-snug text-[#f2ca50] transition-colors group-hover:text-[#ffe088] sm:text-3xl">
              <Link href={`/news/${article.id}`} className="after:absolute after:inset-0">
                {article.title}
              </Link>
            </h3>
            <p className="mb-6 line-clamp-4 text-sm font-light leading-relaxed text-[#d0c5af] sm:text-base">
              {article.summary}
            </p>
          </div>
          <div className="border-t border-[#312517] pt-4">
            <span className="inline-flex items-center gap-2 font-adventure text-base font-bold text-[#f2ca50] transition-colors group-hover:text-[#ffe088]">
              Read More...
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-2"
                aria-hidden="true"
              />
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

function StoryCard({ article }: { article: NewsSummaryArticle }) {
  const style = newsCategoryStyle(article.category)
  const { Icon } = style

  return (
    <article className="stone-frame group relative flex flex-col justify-between overflow-hidden rounded-sm bg-[#1b150e] shadow-xl">
      <div>
        <div className="relative h-32 overflow-hidden border-b border-[#342718] bg-[#0e0c08]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.16),transparent_65%)]" />
          <Icon
            className={cn(
              'absolute -bottom-6 -right-4 h-36 w-36 opacity-20 transition-transform duration-500 group-hover:scale-110',
              style.textColor
            )}
            aria-hidden="true"
          />
          <span
            className={cn(
              'absolute left-2.5 top-2.5 rounded-sm border bg-[#14100b]/90 px-2 py-0.5 font-adventure text-[11px] uppercase tracking-wider backdrop-blur-sm',
              style.borderColor,
              style.textColor
            )}
          >
            {style.label}
          </span>
        </div>
        <div className="p-5">
          <time
            className="mb-2 block font-adventure text-xs text-[#d0c5af]/70"
            dateTime={new Date(article.date * 1000).toISOString()}
          >
            {formatNewsDate(article.date)}
          </time>
          <h4 className="mb-2.5 font-adventure text-lg font-bold leading-snug text-[#f2ca50] transition-colors group-hover:text-[#ffe088]">
            <Link href={`/news/${article.id}`} className="after:absolute after:inset-0">
              {article.title}
            </Link>
          </h4>
          <p className="line-clamp-3 text-xs leading-relaxed text-[#d0c5af]">{article.summary}</p>
        </div>
      </div>
      <div className="border-t border-[#291f14] p-5 pt-3">
        <span className="inline-flex items-center gap-1.5 font-adventure text-xs font-bold text-[#f2ca50] transition-colors group-hover:text-[#ffe088]">
          Read More...
          <ChevronRight
            className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </article>
  )
}
