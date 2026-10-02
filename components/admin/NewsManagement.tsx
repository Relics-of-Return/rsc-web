'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  ApiError,
  createNewsArticle,
  deleteNewsArticle,
  getAdminNews,
  getAdminNewsArticle,
  uploadNewsImage,
  updateNewsArticle,
} from '@/lib/api'
import type { NewsFullArticle, NewsSummaryArticle } from '@/lib/types'
import { formatUnixDate } from '@/lib/utils'

const CATEGORIES = [
  { value: 0, label: 'Website', description: 'Site, launcher, and community updates.' },
  { value: 1, label: 'Game', description: 'Content, client, and world updates.' },
  { value: 2, label: 'Technical', description: 'Infrastructure, fixes, and developer notes.' },
]

const TITLE_LIMIT = 120
const BODY_LIMIT = 100000

type NewsDraft = {
  id: number
  title: string
  category: number
  date: number
  body: string
}

type EditorMode = 'write' | 'preview'

type ToolbarAction = {
  label: string
  title: string
  prefix: string
  suffix?: string
  placeholder: string
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: 'H', title: 'Heading', prefix: '## ', placeholder: 'Section heading' },
  { label: 'B', title: 'Bold', prefix: '**', suffix: '**', placeholder: 'bold text' },
  { label: 'I', title: 'Italic', prefix: '*', suffix: '*', placeholder: 'italic text' },
  { label: 'Quote', title: 'Quote', prefix: '> ', placeholder: 'Quote' },
  { label: '</>', title: 'Code', prefix: '`', suffix: '`', placeholder: 'code' },
  { label: 'Link', title: 'Link', prefix: '[', suffix: '](https://example.com)', placeholder: 'link text' },
  { label: 'List', title: 'Bullet list', prefix: '- ', placeholder: 'List item' },
  { label: '1.', title: 'Numbered list', prefix: '1. ', placeholder: 'List item' },
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

function splitBody(body: string): { teaser: string; articleBody: string } {
  const paragraphs = body.trim().split(/\n{2,}/)

  if (paragraphs.length < 2) {
    return { teaser: '', articleBody: body }
  }

  return {
    teaser: paragraphs[0].trim(),
    articleBody: paragraphs.slice(1).join('\n\n').trim(),
  }
}

function draftFromArticle(article: NewsFullArticle): NewsDraft {
  const { teaser, articleBody } = splitBody(article.body)

  return {
    id: article.id,
    title: article.title,
    category: article.category,
    date: article.date,
    body: [teaser, articleBody].filter(Boolean).join('\n\n'),
  }
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 403) {
    return 'Only administrators can manage news.'
  }

  if (error instanceof ApiError && error.status === 413) {
    return 'This article is too large. Keep the description below 100,000 characters.'
  }

  return fallback
}

function categoryStyle(category: number): string {
  if (category === 1) return 'border-moss/50 bg-moss/10 text-moss'
  if (category === 2) return 'border-ember/50 bg-ember/10 text-ember'
  return 'border-rune-blue/50 bg-rune-blue/10 text-rune-blue'
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(!\[[^\]]*\]\([^\)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^\)]+\))/g)

  return parts.map((part, index) => {
    const image = part.match(/^!\[([^\]]*)\]\(([^\)]+)\)$/)
    if (image && /^\/(?!\/)/.test(image[2])) {
      // eslint-disable-next-line @next/next/no-img-element -- uploaded news images use dynamic API URLs.
      return <img key={index} src={image[2]} alt={image[1]} className="my-4 max-h-80 w-full rounded border border-stone-700 object-contain" />
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="rounded bg-stone-900 px-1.5 py-0.5 text-gold-300">{part.slice(1, -1)}</code>
    }

    const link = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/)
    if (link) {
      return <a key={index} href={link[2]} className="text-gold-400 underline" target="_blank" rel="noreferrer">{link[1]}</a>
    }

    return <span key={index}>{part}</span>
  })
}

function renderMarkdown(body: string): ReactNode[] {
  return body.split(/\n{2,}/).filter(Boolean).map((block, index) => {
    const lines = block.split('\n')
    const first = lines[0]

    if (first.startsWith('### ')) {
      return <h4 key={index} className="font-adventure text-lg uppercase tracking-wide text-gold-400">{renderInline(first.slice(4))}</h4>
    }

    if (first.startsWith('## ')) {
      return <h3 key={index} className="font-adventure text-xl uppercase tracking-wide text-gold-400">{renderInline(first.slice(3))}</h3>
    }

    if (lines.every((line) => /^[-*] /.test(line))) {
      return (
        <ul key={index} className="list-disc space-y-1 pl-5">
          {lines.map((line, lineIndex) => <li key={lineIndex}>{renderInline(line.slice(2))}</li>)}
        </ul>
      )
    }

    if (lines.every((line) => /^\d+\. /.test(line))) {
      return (
        <ol key={index} className="list-decimal space-y-1 pl-5">
          {lines.map((line, lineIndex) => <li key={lineIndex}>{renderInline(line.replace(/^\d+\. /, ''))}</li>)}
        </ol>
      )
    }

    if (first.startsWith('> ')) {
      return <blockquote key={index} className="border-l-2 border-gold-500/70 pl-3 italic text-text-primary">{renderInline(first.slice(2))}</blockquote>
    }

    return <p key={index}>{renderInline(block.replaceAll('\n', ' '))}</p>
  })
}

export function NewsManagement() {
  const [articles, setArticles] = useState<NewsSummaryArticle[]>([])
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(0)
  const [draft, setDraft] = useState<NewsDraft | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [mode, setMode] = useState<EditorMode>('write')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

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
    const timer = window.setTimeout(() => load(0), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const startEdit = async (article: NewsSummaryArticle) => {
    setBusy(true)
    setError(null)

    try {
      const data = await getAdminNewsArticle(article.id)
      setDraft(data.articles ? draftFromArticle(data.articles) : null)
      setMode('write')
      setIsCreating(false)
    } catch (loadError) {
      setError(errorMessage(loadError, 'Unable to load that article.'))
    } finally {
      setBusy(false)
    }
  }

  const startCreate = () => {
    setDraft({ id: 0, title: '', category: 1, date: dateSeconds(todayInput()), body: '' })
    setMode('write')
    setIsCreating(true)
    setError(null)
  }

  const closeEditor = () => {
    setDraft(null)
    setIsCreating(false)
    setMode('write')
  }

  const insertToolbarAction = (action: ToolbarAction) => {
    const textarea = bodyRef.current
    if (!textarea || !draft) return

    const selected = draft.body.slice(textarea.selectionStart, textarea.selectionEnd)
    const value = selected || action.placeholder
    const replacement = `${action.prefix}${value}${action.suffix ?? ''}`
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const body = `${draft.body.slice(0, start)}${replacement}${draft.body.slice(end)}`

    setDraft({ ...draft, body })
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start, start + replacement.length)
    })
  }

  const insertTemplate = (template: string) => {
    const textarea = bodyRef.current
    if (!textarea || !draft) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const body = `${draft.body.slice(0, start)}${template}${draft.body.slice(end)}`

    setDraft({ ...draft, body })
    requestAnimationFrame(() => {
      textarea.focus()
      const cursor = start + template.length
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !draft) return

    setImageBusy(true)
    setError(null)

    try {
      const result = await uploadNewsImage(file)
      const textarea = bodyRef.current
      const alt = file.name.replace(/\.[^.]+$/, '')
      const imageMarkdown = `![${alt}](${result.url})`
      const start = textarea?.selectionStart ?? draft.body.length
      const end = textarea?.selectionEnd ?? start
      const body = `${draft.body.slice(0, start)}${imageMarkdown}${draft.body.slice(end)}`

      setDraft({ ...draft, body })
      requestAnimationFrame(() => {
        textarea?.focus()
        textarea?.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length)
      })
    } catch (uploadError) {
      setError(errorMessage(uploadError, 'Unable to upload that image.'))
    } finally {
      setImageBusy(false)
    }
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft) return

    const title = draft.title.trim()
    const body = draft.body.trim()

    if (!title || !body) {
      setError('Add a title and description before publishing.')
      return
    }

    if (title.length > TITLE_LIMIT || body.length > BODY_LIMIT) {
      setError('One or more fields exceed the allowed length.')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const article = { title, category: draft.category, date: draft.date, body }

      if (isCreating) {
        await createNewsArticle(article)
      } else {
        await updateNewsArticle({ id: draft.id, ...article })
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
    if (!window.confirm(`Delete "${article.title}"? This cannot be undone.`)) return

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
          <h2 className="font-adventure text-lg uppercase tracking-wide text-gold-400">News Management</h2>
          <p className="mt-1 text-xs text-text-secondary">Create polished public issues with a familiar title and description editor.</p>
        </div>
        <Button type="button" size="sm" onClick={startCreate} disabled={busy}>New article</Button>
      </header>

      {error && <p className="border-b border-stone-700 bg-rune-red/10 px-5 py-3 text-sm text-parchment">{error}</p>}

      {draft && (
        <form onSubmit={save} className="border-b border-stone-700 px-5 py-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-500">{isCreating ? 'Create new article' : 'Edit article'}</p>
              <p className="mt-1 text-xs text-text-secondary">Use Markdown-style formatting in the description. Preview before publishing.</p>
            </div>
            <span className="text-xs text-text-muted">{draft.body.length.toLocaleString()} / {BODY_LIMIT.toLocaleString()} characters</span>
          </div>

          <label className="block text-sm font-medium text-text-primary">
            Add a title <span className="text-ember">*</span>
            <Input
              className="mt-2 text-base"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              maxLength={TITLE_LIMIT}
              placeholder="Title"
              required
            />
            <span className="mt-1 block text-[11px] text-text-muted">{draft.title.length} / {TITLE_LIMIT}</span>
          </label>

          <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <label className="text-sm font-medium text-text-primary">
              Category
              <select
                className="mt-2 w-full rounded-md border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-sm text-text-primary focus:border-gold-500/60 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: Number(event.target.value) })}
              >
                {CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
              </select>
              <span className="mt-1 block text-[11px] font-normal text-text-muted">{CATEGORIES.find((category) => category.value === draft.category)?.description}</span>
            </label>
            <label className="text-sm font-medium text-text-primary">
              Publish date
              <Input className="mt-2" type="date" value={dateInput(draft.date)} onChange={(event) => setDraft({ ...draft, date: dateSeconds(event.target.value) })} required />
            </label>
          </div>

          <div className="mt-5 overflow-hidden rounded-md border border-stone-700 bg-stone-950">
            <div className="flex flex-wrap items-center border-b border-stone-700 bg-stone-900/80">
              <button type="button" className={`border-b-2 px-4 py-3 text-sm ${mode === 'write' ? 'border-gold-500 text-text-primary' : 'border-transparent text-text-muted hover:text-text-primary'}`} onClick={() => setMode('write')}>
                Write
              </button>
              <button type="button" className={`border-b-2 px-4 py-3 text-sm ${mode === 'preview' ? 'border-gold-500 text-text-primary' : 'border-transparent text-text-muted hover:text-text-primary'}`} onClick={() => setMode('preview')}>
                Preview
              </button>
              {mode === 'write' && (
                <div className="ml-2 flex flex-wrap items-center gap-1 border-l border-stone-700 pl-2">
                  {TOOLBAR_ACTIONS.map((action) => (
                    <button key={action.title} type="button" title={action.title} aria-label={action.title} onClick={() => insertToolbarAction(action)} className="min-w-8 rounded px-2 py-2 text-xs font-semibold text-text-secondary hover:bg-stone-800 hover:text-gold-400">
                      {action.label}
                    </button>
                  ))}
                  <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={uploadImage} className="sr-only" />
                  <button type="button" title="Upload image" aria-label="Upload image" onClick={() => imageInputRef.current?.click()} disabled={imageBusy} className="rounded px-2 py-2 text-xs text-text-secondary hover:bg-stone-800 hover:text-gold-400 disabled:opacity-50">
                    {imageBusy ? 'Uploading...' : 'Image'}
                  </button>
                  <button type="button" title="Add section" aria-label="Add section" onClick={() => insertTemplate('\n\n## New section\n\n')} className="rounded px-2 py-2 text-xs text-text-secondary hover:bg-stone-800 hover:text-gold-400">Section</button>
                </div>
              )}
            </div>

            {mode === 'write' ? (
              <textarea
                ref={bodyRef}
                className="min-h-[24rem] w-full resize-y bg-stone-950 px-4 py-4 text-sm leading-relaxed text-text-primary placeholder:text-text-muted focus:outline-none"
                value={draft.body}
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                maxLength={BODY_LIMIT}
                placeholder="Type your description here..."
                required
              />
            ) : (
              <article className="min-h-[24rem] space-y-4 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-text-secondary">
                {draft.body ? renderMarkdown(draft.body) : <p className="text-text-muted">Nothing to preview yet.</p>}
              </article>
            )}
          </div>

          <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-text-muted">
            <span>Markdown headings, emphasis, links, lists, and uploaded images are supported in preview.</span>
            <span>{draft.body.length.toLocaleString()} / {BODY_LIMIT.toLocaleString()}</span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={busy}>{busy ? 'Saving...' : isCreating ? 'Publish article' : 'Save changes'}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={closeEditor} disabled={busy}>Cancel</Button>
            <span className="ml-auto text-xs text-text-muted">Publishing is immediate and visible in the public archive.</span>
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
            <thead><tr className="border-b border-stone-700 text-xs uppercase tracking-wide text-text-muted"><th scope="col" className="px-5 py-3 font-medium">Published</th><th scope="col" className="px-5 py-3 font-medium">Title</th><th scope="col" className="hidden px-5 py-3 font-medium sm:table-cell">Category</th><th scope="col" className="px-5 py-3 text-right font-medium">Actions</th></tr></thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id} className="border-b border-stone-800 hover:bg-stone-900/40">
                  <td className="whitespace-nowrap px-5 py-3 text-text-secondary">{formatUnixDate(article.date)}</td>
                  <td className="max-w-xs px-5 py-3 text-gold-400">{article.title}</td>
                  <td className="hidden px-5 py-3 text-text-secondary sm:table-cell"><span className={`rounded border px-2 py-1 text-[10px] uppercase tracking-wide ${categoryStyle(article.category)}`}>{CATEGORIES.find((category) => category.value === article.category)?.label ?? 'News'}</span></td>
                  <td className="whitespace-nowrap px-5 py-3 text-right"><Button type="button" variant="ghost" size="sm" onClick={() => startEdit(article)} disabled={busy}>Edit</Button><Button type="button" variant="ghost" size="sm" onClick={() => remove(article)} disabled={busy}>Delete</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && <footer className="flex items-center justify-between border-t border-stone-700 px-5 py-3 text-sm"><Button type="button" variant="ghost" size="sm" onClick={() => load(page - 1)} disabled={page === 0 || busy}>Previous</Button><span className="text-xs text-text-muted">Page {page + 1} of {pages}</span><Button type="button" variant="ghost" size="sm" onClick={() => load(page + 1)} disabled={page + 1 >= pages || busy}>Next</Button></footer>}
    </section>
  )
}
