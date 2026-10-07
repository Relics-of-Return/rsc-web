'use client'

import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { deleteNewsArticle, getAdminNews, getAdminNewsArticle } from '@/lib/api'
import type { NewsSummaryArticle } from '@/lib/types'
import { formatUnixDate } from '@/lib/utils'
import { NEWS_CATEGORIES, newsErrorMessage } from './news/fields'
import { NewsEditor, type NewsEditorArticle } from './news/NewsEditor'

function categoryStyle(category: number): string {
  if (category === 1) return 'border-moss/50 bg-moss/10 text-moss'
  if (category === 2) return 'border-ember/50 bg-ember/10 text-ember'
  return 'border-rune-blue/50 bg-rune-blue/10 text-rune-blue'
}

export function NewsManagement() {
  const [articles, setArticles] = useState<NewsSummaryArticle[]>([])
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(0)
  const [editing, setEditing] = useState<{ article: NewsEditorArticle | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (nextPage = 0) => {
    setLoading(true)

    try {
      const data = await getAdminNews(nextPage)
      setArticles(data.articles ?? [])
      setPages(data.pages ?? 0)
      setPage(nextPage)
      setError(null)
    } catch (loadError) {
      setError(newsErrorMessage(loadError, 'Unable to load news. The data server may be offline.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => load(0), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const startEdit = async (article: NewsSummaryArticle) => {
    setBusy(true)
    setError(null)

    try {
      const data = await getAdminNewsArticle(article.id)
      if (data.articles) setEditing({ article: data.articles })
      else setError('That article no longer exists.')
    } catch (loadError) {
      setError(newsErrorMessage(loadError, 'Unable to load that article.'))
    } finally {
      setBusy(false)
    }
  }

  const closeEditor = (saved: boolean) => {
    const created = editing?.article === null
    setEditing(null)
    if (saved) load(created ? 0 : page)
  }

  const remove = async (article: NewsSummaryArticle) => {
    if (!window.confirm(`Delete "${article.title}"? This cannot be undone.`)) return

    setBusy(true)
    setError(null)

    try {
      await deleteNewsArticle(article.id)
      await load(page)
    } catch (deleteError) {
      setError(newsErrorMessage(deleteError, 'Unable to delete that article.'))
    } finally {
      setBusy(false)
    }
  }

  const locked = busy || editing !== null

  return (
    <section className="rounded-lg border border-stone-700 bg-stone-800/60">
      <header className="flex flex-col gap-4 border-b border-stone-700 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-adventure text-lg uppercase tracking-wide text-gold-400">News Management</h2>
          <p className="mt-1 text-xs text-text-secondary">Write news from blocks: text, pictures, galleries, callouts, tables, columns, buttons and videos.</p>
        </div>
        <Button type="button" size="sm" onClick={() => setEditing({ article: null })} disabled={locked}>New article</Button>
      </header>

      {error && <p className="border-b border-stone-700 bg-rune-red/10 px-5 py-3 text-sm text-parchment">{error}</p>}

      {editing && <NewsEditor key={editing.article?.id ?? 'new'} article={editing.article} onClose={closeEditor} />}

      {loading ? (
        <p className="px-5 py-10 text-center text-sm text-text-secondary">Loading news...</p>
      ) : articles.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-text-secondary">No news articles yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-700 text-xs uppercase tracking-wide text-text-muted">
                <th scope="col" className="px-5 py-3 font-medium">Published</th>
                <th scope="col" className="px-5 py-3 font-medium">Title</th>
                <th scope="col" className="hidden px-5 py-3 font-medium sm:table-cell">Category</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id} className="border-b border-stone-800 hover:bg-stone-900/40">
                  <td className="whitespace-nowrap px-5 py-3 text-text-secondary">{formatUnixDate(article.date)}</td>
                  <td className="max-w-xs px-5 py-3">
                    <a href={`/news/${article.id}`} target="_blank" rel="noreferrer" className="text-gold-400 hover:text-gold-500">{article.title}</a>
                  </td>
                  <td className="hidden px-5 py-3 text-text-secondary sm:table-cell">
                    <span className={`rounded border px-2 py-1 text-[10px] uppercase tracking-wide ${categoryStyle(article.category)}`}>
                      {NEWS_CATEGORIES.find((category) => category.value === article.category)?.label ?? 'News'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(article)} disabled={locked}>Edit</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(article)} disabled={locked}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <footer className="flex items-center justify-between border-t border-stone-700 px-5 py-3 text-sm">
          <Button type="button" variant="ghost" size="sm" onClick={() => load(page - 1)} disabled={page === 0 || busy}>Previous</Button>
          <span className="text-xs text-text-muted">Page {page + 1} of {pages}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => load(page + 1)} disabled={page + 1 >= pages || busy}>Next</Button>
        </footer>
      )}
    </section>
  )
}
