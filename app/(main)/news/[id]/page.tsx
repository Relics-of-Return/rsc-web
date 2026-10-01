import { notFound } from 'next/navigation'
import Link from 'next/link'

import { Container } from '@/components/ui/Container'
import { newsCategoryStyle } from '@/data/news'
import type { NewsArticleData } from '@/lib/types'
import { fetchWwwJson } from '@/lib/www'
import { NewsArticleHeader } from '@/components/news/NewsArticleHeader'
import { NewsArticleBody } from '@/components/news/NewsArticleBody'

interface ArticlePageProps {
  params: Promise<{ id: string }>
}

function isValidId(id: string): boolean {
  return /^\d+$/.test(id)
}

export async function generateMetadata({ params }: ArticlePageProps) {
  const { id } = await params

  if (!isValidId(id)) {
    return { title: 'News' }
  }

  try {
    const data = await fetchWwwJson<NewsArticleData>(`/api/news?id=${id}`)
    return { title: data.articles?.title ?? 'News' }
  } catch {
    return { title: 'News' }
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params

  if (!isValidId(id)) {
    notFound()
  }

  let article: NewsArticleData['articles'] = null
  let loadError = false

  try {
    const data = await fetchWwwJson<NewsArticleData>(`/api/news?id=${id}`)
    article = data.articles
  } catch {
    loadError = true
  }

  if (loadError) {
    return (
      <Container className="py-16 text-center">
        <p className="text-text-secondary">Unable to load the article. The game server may be offline.</p>
        <Link href="/news" className="mt-6 inline-block text-sm text-gold-400 hover:text-gold-500">
          &laquo; Back to all news
        </Link>
      </Container>
    )
  }

  if (!article) {
    notFound()
  }

  const style = newsCategoryStyle(article.category)

  return (
    <Container className="py-16">
      <div className="max-w-3xl mx-auto">
        <NewsArticleHeader article={article} />

        <article className="mt-8 rounded-lg border border-stone-700 bg-stone-800/60 p-8">
          <div className="mt-6 text-text-secondary leading-relaxed">
            <NewsArticleBody body={article.body} />
          </div>
          <p className="mt-10 text-xs text-text-muted">
            Published{' '}
            <time dateTime={new Date(article.date * 1000).toISOString()}>
              {new Date(article.date * 1000).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </time>{' '}
            under <span className={style.textColor}>{style.label}</span>.
          </p>
        </article>
      </div>
    </Container>
  )
}
