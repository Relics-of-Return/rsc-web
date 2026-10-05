'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  ApiError,
  createGuideArticle,
  deleteGuideArticle,
  getAdminGuide,
  getAdminGuides,
  getGuideRevisions,
  restoreGuideRevision,
  updateGuideArticle,
  uploadGuideImage,
} from '@/lib/api'
import type { GuideRevision, GuideSummary } from '@/lib/types'
import { formatUnixDateTime, formatUsername } from '@/lib/utils'

const CATEGORIES = [
  { value: 'guide', label: 'Guide', description: 'An overview article: a mode, a system, a place.' },
  {
    value: 'quest',
    label: 'Quest walkthrough',
    description: 'Slug it after the quest and it appears on that quest page.',
  },
]

const TITLE_LIMIT = 255
const DESCRIPTION_LIMIT = 500
const BODY_LIMIT = 200000

type GuideDraft = {
  id: number
  slug: string
  title: string
  description: string
  category: string
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

/** The address of an article, from its title or whatever the editor typed. */
export function guideSlugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 401) {
    return 'Log in as an administrator to manage guides.'
  }

  if (error instanceof ApiError && error.status === 403) {
    return 'Only administrators can manage guides.'
  }

  if (error instanceof ApiError && error.status === 409) {
    return 'A guide with this slug already exists. Pick another address.'
  }

  if (error instanceof ApiError && error.status === 413) {
    return 'That article is too large. Keep the body under 200,000 characters.'
  }

  return fallback
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(!\[[^\]]*\]\([^\)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^\)]+\))/g)

  return parts.map((part, index) => {
    const image = part.match(/^!\[([^\]]*)\]\(([^\)]+)\)$/)
    if (image && /^\/(?!\/)/.test(image[2])) {
      // eslint-disable-next-line @next/next/no-img-element -- uploaded guide images use dynamic API URLs.
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
      return <h4 key={index} className="mt-4 font-adventure text-lg uppercase tracking-wide text-gold-400">{renderInline(first.slice(4))}</h4>
    }

    if (first.startsWith('## ')) {
      return <h3 key={index} className="mt-5 font-adventure text-xl uppercase tracking-wide text-gold-400">{renderInline(first.slice(3))}</h3>
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

export function GuideManagement() {
  const [guides, setGuides] = useState<GuideSummary[]>([])
  const [draft, setDraft] = useState<GuideDraft | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)
  const [mode, setMode] = useState<EditorMode>('write')
  const [revisions, setRevisions] = useState<GuideRevision[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const data = await getAdminGuides()
      setGuides(data.guides ?? [])
      setError(null)
    } catch (loadError) {
      setError(errorMessage(loadError, 'Unable to load guides. The data server may be offline.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const startEdit = async (guide: GuideSummary) => {
    setBusy(true)
    setError(null)

    try {
      const data = await getAdminGuide(guide.id)

      if (!data.guide) {
        setError('That guide no longer exists.')
        return
      }

      setDraft({
        id: data.guide.id,
        slug: data.guide.slug,
        title: data.guide.title,
        description: data.guide.description,
        category: data.guide.category,
        body: data.guide.body,
      })
      setRevisions([])
      setMode('write')
      setSlugTouched(true)

      try {
        const revs = await getGuideRevisions(guide.id)
        setRevisions(revs.revisions ?? [])
      } catch {
        // the revision list is a nicety; the article itself is already open
      }
    } catch (loadError) {
      setError(errorMessage(loadError, 'Unable to load that guide.'))
    } finally {
      setBusy(false)
    }
  }

  const startCreate = () => {
    setDraft({ id: 0, slug: '', title: '', description: '', category: 'guide', body: '' })
    setRevisions([])
    setMode('write')
    setSlugTouched(false)
    setError(null)
  }

  const closeEditor = () => {
    setDraft(null)
    setRevisions([])
    setMode('write')
  }

  const changeTitle = (title: string) => {
    if (!draft) return

    setDraft({
      ...draft,
      title,
      // while creating, the slug follows the title until the editor edits it
      slug: draft.id === 0 && !slugTouched ? guideSlugify(title) : draft.slug,
    })
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

  const insertImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !draft) return

    setImageBusy(true)
    setError(null)

    try {
      const result = await uploadGuideImage(file)
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

    const slug = guideSlugify(draft.slug)
    const title = draft.title.trim()
    const description = draft.description.trim()
    const body = draft.body.trim()

    if (!slug) {
      setError('Add a slug — it is the article address.')
      return
    }

    if (!title || !body) {
      setError('Add a title and a body before saving.')
      return
    }

    if (title.length > TITLE_LIMIT || description.length > DESCRIPTION_LIMIT || body.length > BODY_LIMIT) {
      setError('That article is too large. Keep the body under 200,000 characters.')
      return
    }

    setBusy(true)
    setError(null)

    try {
      if (draft.id === 0) {
        const result = await createGuideArticle({ slug, title, description, category: draft.category, body })

        setDraft({ ...draft, id: result.id ?? 0, slug, title, description, body })

        if (result.id) {
          const revs = await getGuideRevisions(result.id)
          setRevisions(revs.revisions ?? [])
        }
      } else {
        await updateGuideArticle({ id: draft.id, slug, title, description, category: draft.category, body })

        const revs = await getGuideRevisions(draft.id)
        setRevisions(revs.revisions ?? [])
      }

      await load()
    } catch (saveError) {
      setError(errorMessage(saveError, 'Unable to save that guide.'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!draft || draft.id === 0) return

    if (!window.confirm(`Delete "${draft.title}"? Its revision history is kept.`)) {
      return
    }

    setBusy(true)
    setError(null)

    try {
      await deleteGuideArticle(draft.id)
      closeEditor()
      await load()
    } catch (deleteError) {
      setError(errorMessage(deleteError, 'Unable to delete that guide.'))
    } finally {
      setBusy(false)
    }
  }

  const restore = async (revision: GuideRevision) => {
    if (!draft || draft.id === 0) return

    const when = formatUnixDateTime(revision.revisionDate)

    if (!window.confirm(`Restore the version saved ${when} by ${formatUsername(revision.editor) || 'unknown'}?`)) {
      return
    }

    setBusy(true)
    setError(null)

    try {
      await restoreGuideRevision(revision.id)

      const data = await getAdminGuide(draft.id)

      if (data.guide) {
        setDraft({
          id: data.guide.id,
          slug: data.guide.slug,
          title: data.guide.title,
          description: data.guide.description,
          category: data.guide.category,
          body: data.guide.body,
        })
      }

      const revs = await getGuideRevisions(draft.id)
      setRevisions(revs.revisions ?? [])
      await load()
    } catch (restoreError) {
      setError(errorMessage(restoreError, 'Unable to restore that revision.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-text-secondary">
          Wiki articles: guides, and quest walkthroughs (slug one after a quest and it appears on
          that quest&apos;s page). Every save keeps a snapshot, so any version can be restored.
        </p>
        <Button size="sm" onClick={startCreate} disabled={busy}>
          New guide
        </Button>
      </div>

      {error && (
        <p className="mt-4 rounded border border-rune-red/50 bg-rune-red/10 px-3 py-2 text-sm text-[#d99b9b]">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="self-start rounded-lg border border-stone-700 bg-stone-900/60">
          <h3 className="border-b border-stone-700 bg-stone-800/80 px-4 py-2.5 font-adventure uppercase tracking-wide text-gold-400">
            Articles ({guides.length})
          </h3>
          {loading ? (
            <p className="px-4 py-6 text-sm text-text-muted">Loading…</p>
          ) : guides.length === 0 ? (
            <p className="px-4 py-6 text-sm text-text-muted">No articles yet. Create the first one.</p>
          ) : (
            <ul className="max-h-[560px] divide-y divide-stone-800 overflow-y-auto">
              {guides.map((guide) => (
                <li key={guide.id}>
                  <button
                    type="button"
                    onClick={() => startEdit(guide)}
                    disabled={busy}
                    className={
                      draft?.id === guide.id
                        ? 'w-full bg-stone-800/70 px-4 py-3 text-left'
                        : 'w-full px-4 py-3 text-left transition-colors hover:bg-stone-800/40'
                    }
                  >
                    <span className="block truncate text-sm text-text-primary">{guide.title}</span>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      {guide.category === 'quest' ? 'Quest walkthrough' : 'Guide'} · /{guide.slug}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="min-w-0">
          {!draft ? (
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 px-4 py-12 text-center text-sm text-text-muted">
              Pick an article to edit, or create a new one.
            </div>
          ) : (
            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Slug</span>
                  <Input
                    value={draft.slug}
                    onChange={(event) => {
                      setSlugTouched(true)
                      setDraft({ ...draft, slug: event.target.value })
                    }}
                    placeholder="e.g. dragon-slayer"
                    maxLength={80}
                  />
                  <span className="mt-1 block text-xs text-text-muted">
                    Address: /guides/{guideSlugify(draft.slug) || '…'}
                  </span>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Category</span>
                  <select
                    value={draft.category}
                    onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                    className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2.5 text-sm text-text-primary focus:border-gold-600 focus:outline-none"
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs text-text-muted">
                    {CATEGORIES.find((category) => category.value === draft.category)?.description}
                  </span>
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Title</span>
                <Input
                  value={draft.title}
                  onChange={(event) => changeTitle(event.target.value)}
                  placeholder="Article title"
                  maxLength={TITLE_LIMIT}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Description</span>
                <Input
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  placeholder="One line, shown on the guides index"
                  maxLength={DESCRIPTION_LIMIT}
                />
              </label>

              <div>
                <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-b-0 border-stone-700 bg-stone-800/70 px-2 py-1.5">
                  {TOOLBAR_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      title={action.title}
                      onClick={() => insertToolbarAction(action)}
                      className="rounded px-2 py-1 text-xs text-text-secondary hover:bg-stone-700 hover:text-gold-400"
                    >
                      {action.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    title="Upload an image and insert it at the cursor"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={imageBusy}
                    className="rounded px-2 py-1 text-xs text-text-secondary hover:bg-stone-700 hover:text-gold-400 disabled:opacity-50"
                  >
                    {imageBusy ? 'Uploading…' : 'Image'}
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    onChange={insertImage}
                    className="hidden"
                  />
                  <span className="mx-1 h-4 w-px bg-stone-700" />
                  <button
                    type="button"
                    onClick={() => setMode('write')}
                    className={
                      mode === 'write'
                        ? 'rounded px-2 py-1 text-xs text-gold-400'
                        : 'rounded px-2 py-1 text-xs text-text-secondary hover:text-gold-400'
                    }
                  >
                    Write
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('preview')}
                    className={
                      mode === 'preview'
                        ? 'rounded px-2 py-1 text-xs text-gold-400'
                        : 'rounded px-2 py-1 text-xs text-text-secondary hover:text-gold-400'
                    }
                  >
                    Preview
                  </button>
                </div>
                {mode === 'write' ? (
                  <textarea
                    ref={bodyRef}
                    value={draft.body}
                    onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                    rows={20}
                    placeholder="Markdown: ## headings, **bold**, - lists, [links](https://…)"
                    className="w-full rounded-b-md border border-stone-700 bg-stone-900 px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-gold-600 focus:outline-none"
                  />
                ) : (
                  <div className="min-h-[200px] space-y-3 rounded-b-md border border-stone-700 bg-stone-900/60 px-4 py-3 text-sm text-text-secondary">
                    {renderMarkdown(draft.body)}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={busy}>
                  {draft.id === 0 ? 'Publish guide' : 'Save changes'}
                </Button>
                <Button type="button" variant="outline" onClick={closeEditor} disabled={busy}>
                  Cancel
                </Button>
                {draft.id !== 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={remove}
                    disabled={busy}
                    className="ml-auto border-rune-red/60 text-[#d99b9b]"
                  >
                    Delete
                  </Button>
                )}
              </div>

              {draft.id !== 0 && revisions.length > 0 && (
                <div className="rounded-lg border border-stone-700 bg-stone-900/60">
                  <h3 className="border-b border-stone-700 bg-stone-800/80 px-4 py-2.5 font-adventure uppercase tracking-wide text-gold-400">
                    Revisions ({revisions.length})
                  </h3>
                  <ul className="max-h-64 divide-y divide-stone-800 overflow-y-auto">
                    {revisions.map((revision) => (
                      <li key={revision.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-text-secondary">{revision.title}</span>
                          <span className="block text-xs text-text-muted">
                            {formatUsername(revision.editor) || 'unknown'} · {formatUnixDateTime(revision.revisionDate)}
                          </span>
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => restore(revision)}
                          disabled={busy}
                        >
                          Restore
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </form>
          )}
        </section>
      </div>
    </div>
  )
}

