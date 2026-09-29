import { Pagination } from '@/components/shared/Pagination'
import { Container } from '@/components/ui/Container'
import type { NewsListData } from '@/lib/types'
import { fetchWwwJson } from '@/lib/www'
import { NewsMasthead } from '@/components/news/NewsMasthead'
import { NewsCard } from '@/components/news/NewsCard'

export const metadata = {
  title: 'News',
}

interface NewsPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const { page: rawPage } = await searchParams
  const page = Number.parseInt(rawPage ?? '0', 10) || 0

  let data: NewsListData | null = null
  let loadError = false

  try {
    data = await fetchWwwJson<NewsListData>(`/api/news?page=${page}`)
  } catch {
    loadError = true
  }

  const articles = data?.articles ?? []
  const totalPages = data?.pages ?? 0

  return (
    <Container className="py-16">
      <NewsMasthead />

      {loadError ? (
        <p className="mt-12 text-center text-text-secondary">
          Unable to load news. The game server may be offline.
        </p>
      ) : articles.length === 0 ? (
        <p className="mt-12 text-center text-text-secondary">
          No news has been posted yet.
        </p>
      ) : (
        <div className="mt-12 max-w-3xl mx-auto flex flex-col gap-6">
          {articles.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(p) => (p > 0 ? `/news?page=${p}` : '/news')}
      />
    </Container>
  )
}
