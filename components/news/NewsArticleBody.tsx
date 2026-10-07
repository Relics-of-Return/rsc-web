import { parseNews } from '@/lib/news-format'
import { NewsBlocks } from './NewsDocument'

export function NewsArticleBody({ body }: { body: string }) {
  return <NewsBlocks blocks={parseNews(body).blocks} />
}
