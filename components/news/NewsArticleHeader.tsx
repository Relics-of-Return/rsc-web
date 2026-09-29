import Link from 'next/link'

import { cn } from '@/lib/utils'
import { formatNewsDate } from '@/lib/utils'
import { newsCategoryStyle } from '@/data/news'
import { CategoryBadge } from './CategoryBadge'
import type { NewsFullArticle } from '@/lib/types'

interface NewsArticleHeaderProps {
  article: NewsFullArticle
}

export function NewsArticleHeader({ article }: NewsArticleHeaderProps) {
  const style = newsCategoryStyle(article.category)

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-text-secondary">
        <Link href="/" className="transition-colors hover:text-gold-400">
          Home
        </Link>
        <span>/</span>
        <Link href="/news" className="transition-colors hover:text-gold-400">
          News Archive
        </Link>
      </nav>

      <div className="mt-8 flex items-center gap-3 text-xs">
        <CategoryBadge category={article.category} />
        <time className="text-text-muted" dateTime={new Date(article.date * 1000).toISOString()}>
          {formatNewsDate(article.date)}
        </time>
      </div>

      <h1 className="mt-4 font-adventure text-3xl sm:text-4xl text-gold-500 uppercase tracking-wide">
        {article.title}
      </h1>

      <div className={cn('mt-4 h-1.5 w-24 rounded-full', style.accentColor)} />
    </div>
  )
}
