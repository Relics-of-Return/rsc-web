'use client'

import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ApiError, createNewsArticle, deleteNewsArticle, getAdminNews, getAdminNewsArticle, updateNewsArticle } from '@/lib/api'
import type { NewsFullArticle, NewsSummaryArticle } from '@/lib/types'
import { formatUnixDate } from '@/lib/utils'

const CATEGORIES = [
  { value: 0, label: 'Website' },
  { value: 1, label: 'Game' },
  { value: 2, label: 'Technical' },
]

function todayInput(): string {
  return new Date().toISOString().slice(0, 10)
}

function dateInput(date: number): string {
  return new Date(date * 1000).toISOString().slice(0, 10)
}

function dateSeconds(value: string): number {
  return Math.floor(new Date(`${value}T00:00:00`).getTime() / 1000)
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 403) {
    return 'Only administrators can manage news.'
  }

  return fallback
}

export function NewsManagement() {
  const [articles, setArticles] = useState<NewsSummaryArticle[]>([])
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(0)
  const [editing, setEditing] = useState<NewsFullArticle | null>(null)
  const [isCreating, setIsCreating] = useState(false)
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
      setError(errorMessage(loadError, 'Unable to load news. The data server may be offline.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(0)
  }, [load])

  const startEdit = async (article: NewsSummaryArticle) => {
    setBusy(true)
    setError(null)

    try {
      const data = await getAdminNewsArticle(article.id)
      setEditing(data.articles)
      setIsCreating(false)
    } catch (loadError) {
      setError(errorMessage(loadError, 'Unable to load that article.'))
    } finally {
      setBusy(false)
    }
  }

  const startCreate = () => {
    setEditing({
      id: 0,
      title: '',
      category: 1,
      date: dateSeconds(todayInput()),
      summary: '',
      body: '',
    })
    setIsCreating(true)
    setError(null)
  }

  const closeEditor = () => {
    setEditing(null)
    setIsCreating(false)
  }

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editing) return

    setBusy(true)
    setError(null)

    try {
      const article = {
        title: editing.title.trim(),
        category: editing.category,
        date: editing.date,
        body: editing.body.trim(),
      }

      if (isCreating) {
        await createNewsArticle(article)
      } else {
        await updateNewsArticle({ id: editing.id, ...article })
      }

      closeEditor()
      await load(isCreating ? 0 : page)
    } catch (saveError) {
      setError(errorMessage(saveError, 'Unable to save that article.'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (article: NewsSummaryArticle) => {
    if (!window.confirm(`Delete “${article.title}”? This cannot be undone.`)) return

    setBusy(true)
    setError(null)

    try {
      await deleteNewsArticle(article.id)
      await load(page)
    } catch (deleteError) {
      setError(errorMessage(deleteError, 'Unable to delete that article.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-lg border border-stone-700 bg-stone-800/60">
      <header className="flex flex-col gap-4 border-b border-stone-700 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-adventure text-lg uppercase tracking-wide text-gold-400">
            News Management
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Create, edit, and remove public news articles. Administrators only.
          </p>
        </div>
        <Button type="button" size="sm" onClick={startCreate} disabled={busy}>
          New article
        </Button>
      </header>

      {error && (
        <p className="border-b border-stone-700 bg-rune-red/10 px-5 py-3 text-sm text-parchment">
          {error}
        </p>
      )}

      {editing && (
        <form onSubmit={save} className="border-b border-stone-700 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem_10rem]">
            <label className="text-xs uppercase tracking-wide text-text-muted">
              Title
              <Input
                className="mt-2"
                value={editing.title}
                onChange={(event) => setEditing({ ...editing, title: event.target.value })}
                maxLength={255}
                required
              />
            </label>
            <label className="text-xs uppercase tracking-wide text-text-muted">
              Category
              <select
                className="mt-2 w-full rounded-md border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-sm text-text-primary focus:border-gold-500/60 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                value={editing.category}
                onChange={(event) => setEditing({ ...editing, category: Number(event.target.value) })}
              >
                {CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs uppercase tracking-wide text-text-muted">
              Publish date
              <Input
                className="mt-2"
                type="date"
                value={dateInput(editing.date)}
                onChange={(event) => setEditing({ ...editing, date: dateSeconds(event.target.value) })}
                required
              />
            </label>
          </div>

          <label className="mt-4 block text-xs uppercase tracking-wide text-text-muted">
            Article body
            <textarea
              className="mt-2 min-h-56 w-full rounded-md border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-sm leading-relaxed text-text-primary placeholder:text-text-muted focus:border-gold-500/60 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
              value={editing.body}
              onChange={(event) => setEditing({ ...editing, body: event.target.value })}
              required
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? 'Saving...' : isCreating ? 'Publish article' : 'Save changes'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={closeEditor} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      )}

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
                <th scope="col" className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id} className="border-b border-stone-800 hover:bg-stone-900/40">
                  <td className="whitespace-nowrap px-5 py-3 text-text-secondary">
                    {formatUnixDate(article.date)}
                  </td>
                  <td className="max-w-xs px-5 py-3 text-gold-400">{article.title}</td>
                  <td className="hidden px-5 py-3 text-text-secondary sm:table-cell">
                    {CATEGORIES.find((category) => category.value === article.category)?.label ?? 'News'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(article)} disabled={busy}>
                      Edit
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(article)} disabled={busy}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <footer className="flex items-center justify-between border-t border-stone-700 px-5 py-3 text-sm">
          <Button type="button" variant="ghost" size="sm" onClick={() => load(page - 1)} disabled={page === 0 || busy}>
            Previous
          </Button>
          <span className="text-xs text-text-muted">Page {page + 1} of {pages}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => load(page + 1)} disabled={page + 1 >= pages || busy}>
            Next
          </Button>
        </footer>
      )}
    </section>
  )
}
