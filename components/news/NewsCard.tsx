import Link from 'next/link'

import { cn } from '@/lib/utils'
import { formatNewsDate } from '@/lib/utils'
import { newsCategoryStyle } from '@/data/news'
import { CategoryBadge } from './CategoryBadge'
import type { NewsSummaryArticle } from '@/lib/types'

interface NewsCardProps {
  article: NewsSummaryArticle
}

export function NewsCard({ article }: NewsCardProps) {
  const style = newsCategoryStyle(article.category)

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-lg border border-stone-700 bg-stone-800/60 p-6 pl-6 transition-all duration-200',
        'hover:border-gold-500/50 hover:bg-stone-800'
      )}
    >
      <span className={cn('absolute left-0 top-0 bottom-0 w-1', style.accentColor)} />

      <div className="flex items-center gap-3 text-xs">
        <CategoryBadge category={article.category} />
        <time className="text-text-muted" dateTime={new Date(article.date * 1000).toISOString()}>
          {formatNewsDate(article.date)}
        </time>
      </div>

      <h2 className="mt-3 font-adventure text-2xl text-gold-400 uppercase tracking-wide">
        <Link
          href={`/news/${article.id}`}
          className="transition-colors group-hover:text-gold-500"
        >
          {article.title}
        </Link>
      </h2>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-text-secondary">
        {article.summary}
      </p>

      <Link
        href={`/news/${article.id}`}
        className="mt-4 inline-block text-sm font-medium text-gold-400 transition-colors group-hover:text-gold-500"
      >
        Read more &rarr;
      </Link>
    </article>
  )
}
