'use client'

import { Fragment, useEffect, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { ArrowDown, ArrowUp, CopyPlus, Eye, FileDown, PenLine, Plus, SquareSplitHorizontal, Trash2, X } from 'lucide-react'

import { CategoryBadge } from '@/components/news/CategoryBadge'
import { NewsCard } from '@/components/news/NewsCard'
import { NewsBlocks } from '@/components/news/NewsDocument'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { newsCategoryStyle } from '@/data/news'
import { createNewsArticle, updateNewsArticle } from '@/lib/api'
import {
  blockId,
  createBlock,
  isRichNews,
  markdownToNews,
  parseNews,
  serializeNews,
  singleLine,
  SUMMARY_LIMIT,
  type NewsBlock,
  type NewsBlockType,
} from '@/lib/news-format'
import { cn, formatNewsDate } from '@/lib/utils'
import { BLOCK_TYPES, BlockFields, blockMeta } from './BlockFields'
import { Field, IconButton, NEWS_CATEGORIES, newsErrorMessage, Segmented, SmallButton } from './fields'

const TITLE_LIMIT = 120
const BODY_LIMIT = 150000

export interface NewsEditorArticle {
  id: number
  title: string
  category: number
  date: number
  body: string
}

type View = 'split' | 'edit' | 'preview'

function todaySeconds(): number {
  return dateSeconds(dateInput(Date.now() / 1000))
}

// the local day, as dateSeconds stores it: toISOString's UTC day is a day
// out east or west of Greenwich
function dateInput(date: number): string {
  const day = new Date(date * 1000)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`
}

function dateSeconds(value: string): number {
  return Math.floor(new Date(`${value}T00:00:00`).getTime() / 1000)
}

function snapshot(title: string, category: number, date: number, body: string): string {
  return JSON.stringify([title, category, date, body])
}

function AddBlockMenu({ onPick, onClose }: { onPick: (type: NewsBlockType) => void; onClose?: () => void }) {
  return (
    <div className="rounded-md border border-gold-500/30 bg-stone-900 p-2 shadow-lg">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[11px] uppercase tracking-wide text-text-muted">Add a block</span>
        {onClose && (
          <IconButton title="Close" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </IconButton>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
        {BLOCK_TYPES.map(({ type, label, description, Icon }) => (
          <button key={type} type="button" onClick={() => onPick(type)} className="flex items-start gap-2 rounded px-2 py-2 text-left transition-colors hover:bg-stone-800">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" aria-hidden />
            <span>
              <span className="block text-xs text-text-primary">{label}</span>
              <span className="block text-[11px] leading-snug text-text-muted">{description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// enter in a one-line field would publish the article
function keepEnterInField(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault()
}

// links in the preview would leave the editor
function stayInEditor(event: MouseEvent) {
  if ((event.target as HTMLElement).closest('a')) event.preventDefault()
}

export function NewsEditor({ article, onClose }: { article: NewsEditorArticle | null; onClose: (saved: boolean) => void }) {
  const [initial] = useState(() => {
    const doc = article ? parseNews(article.body) : { summary: '', blocks: [] }
    const blocks = doc.blocks.length ? doc.blocks : [createBlock('text')]
    const title = article?.title ?? ''
    const category = article?.category ?? 1
    const date = article?.date ?? todaySeconds()

    return {
      title,
      category,
      date,
      summary: doc.summary,
      blocks,
      converted: !!article && !isRichNews(article.body),
      snapshot: snapshot(title, category, date, serializeNews({ summary: doc.summary, blocks })),
    }
  })

  const [title, setTitle] = useState(initial.title)
  const [category, setCategory] = useState(initial.category)
  const [date, setDate] = useState(initial.date)
  const [summary, setSummary] = useState(initial.summary)
  const [blocks, setBlocks] = useState<NewsBlock[]>(initial.blocks)
  const [view, setView] = useState<View>('split')
  const [addingAt, setAddingAt] = useState<number | null>(null)
  const [removed, setRemoved] = useState<{ block: NewsBlock; index: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importText, setImportText] = useState('')

  const body = serializeNews({ summary, blocks })
  const dirty = snapshot(title, category, date, body) !== initial.snapshot

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const updateBlock = (index: number, block: NewsBlock) => setBlocks((current) => current.map((b, i) => (i === index ? block : b)))

  const insertBlock = (index: number, type: NewsBlockType) => {
    setBlocks((current) => [...current.slice(0, index), createBlock(type), ...current.slice(index)])
    setAddingAt(null)
  }

  const moveBlock = (index: number, by: number) =>
    setBlocks((current) => {
      const next = [...current]
      const [block] = next.splice(index, 1)
      next.splice(index + by, 0, block)
      return next
    })

  const duplicateBlock = (index: number) =>
    setBlocks((current) => [...current.slice(0, index + 1), { ...structuredClone(current[index]), id: blockId() }, ...current.slice(index + 1)])

  const removeBlock = (index: number) => {
    setRemoved({ block: blocks[index], index })
    setBlocks((current) => current.filter((_, i) => i !== index))
  }

  const undoRemove = () => {
    if (!removed) return
    setBlocks((current) => [...current.slice(0, removed.index), removed.block, ...current.slice(removed.index)])
    setRemoved(null)
  }

  // a "# Title" first line names the article; the first line after it is the summary
  const importMarkdown = (mode: 'replace' | 'append') => {
    let text = importText.replace(/\r\n/g, '\n').trim()
    const heading = text.match(/^# (.+)(\n|$)/)
    if (heading) text = text.slice(heading[0].length).trim()

    const doc = markdownToNews(text)
    if (!doc.blocks.length) {
      setError('There was nothing to import.')
      return
    }

    if (mode === 'replace') {
      if (!window.confirm('Replace every block in this article with the imported ones?')) return
      setBlocks(doc.blocks)
      if (heading) setTitle(heading[1].trim().slice(0, TITLE_LIMIT))
      if (doc.summary) setSummary(doc.summary)
    } else {
      setBlocks((current) => [...current.filter((block) => block.type !== 'text' || block.text.trim()), ...doc.blocks])
      if (heading && !title.trim()) setTitle(heading[1].trim().slice(0, TITLE_LIMIT))
      if (doc.summary && !summary.trim()) setSummary(doc.summary)
    }

    setError(null)
    setImporting(false)
    setImportText('')
  }

  const cancel = () => {
    if (dirty && !window.confirm('Discard your changes to this article?')) return
    onClose(false)
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const cleanTitle = title.trim()

    if (!cleanTitle) {
      setError('Give the article a title.')
      return
    }

    if (!singleLine(summary)) {
      setError('Write a summary: it is what the news cards and the in-game welcome screen show.')
      return
    }

    if (body.length > BODY_LIMIT) {
      setError(`The article is ${body.length.toLocaleString('en-GB')} characters once saved, over the ${BODY_LIMIT.toLocaleString('en-GB')} limit. Split it into smaller articles.`)
      return
    }

    setBusy(true)
    setError(null)

    try {
      const payload = { title: cleanTitle, category, date, body }
      if (article) await updateNewsArticle({ id: article.id, ...payload })
      else await createNewsArticle(payload)
      onClose(true)
    } catch (saveError) {
      setError(newsErrorMessage(saveError, 'Unable to save that article.'))
      setBusy(false)
    }
  }

  const style = newsCategoryStyle(category)
  const shownTitle = title.trim() || 'Untitled article'

  return (
    <form onSubmit={save} onKeyDown={keepEnterInField} className="border-b border-stone-700 px-5 py-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-500">{article ? 'Edit article' : 'Create new article'}</p>
          <p className="mt-1 text-xs text-text-secondary">Build the article from blocks. The preview shows it as players will see it.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <SmallButton aria-pressed={importing} onClick={() => setImporting((open) => !open)}>
          <FileDown className="h-3.5 w-3.5" /> Import Markdown
        </SmallButton>
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: 'edit', label: <><PenLine className="h-3.5 w-3.5" /> Edit</> },
            { value: 'split', label: <><SquareSplitHorizontal className="h-3.5 w-3.5" /> Side by side</> },
            { value: 'preview', label: <><Eye className="h-3.5 w-3.5" /> Preview</> },
          ]}
        />
        </div>
      </div>

      {importing && (
        <div className="mb-5 space-y-3 rounded-md border border-gold-500/30 bg-stone-900 p-4">
          <p className="text-xs leading-relaxed text-text-secondary">
            Paste an article written in Markdown. <code className="text-gold-400"># Title</code> on the first line names it and the line after it becomes the summary.{' '}
            <code className="text-gold-400">##</code> headings, paragraphs, lists, <code className="text-gold-400">&gt;</code> quotes,{' '}
            <code className="text-gold-400">&gt; [!TIP] Title</code> callouts (NOTE, INFO, TIP, WARNING, DANGER), <code className="text-gold-400">| tables |</code>,{' '}
            <code className="text-gold-400">---</code> dividers and pictures become blocks; several pictures on consecutive lines become a gallery. The toolbar&apos;s tags, such as{' '}
            <code className="text-gold-400">[color=gold]</code> and <code className="text-gold-400">[item=398]Rune scimitar[/item]</code>, work as they are.
          </p>
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={10}
            aria-label="Markdown to import"
            placeholder={'# Title\nA one-line summary.\n\n## A section\n\nSome text.'}
            className="block w-full resize-y rounded-md border border-stone-700 bg-stone-950 px-3 py-2 font-label text-xs leading-relaxed text-text-primary placeholder:text-text-muted focus:border-gold-500/60 focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <SmallButton onClick={() => importMarkdown('replace')} disabled={!importText.trim()}>Replace the article</SmallButton>
            <SmallButton onClick={() => importMarkdown('append')} disabled={!importText.trim()}>Add to the end</SmallButton>
            <SmallButton onClick={() => setImporting(false)}>Cancel</SmallButton>
          </div>
        </div>
      )}

      {initial.converted && (
        <p className="mb-4 rounded-md border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-xs text-parchment">
          This article was written in Markdown and has been turned into blocks. Saving stores it in the new format.
        </p>
      )}

      {error && <p className="mb-4 rounded-md border border-rune-red/60 bg-rune-red/10 px-3 py-2 text-sm text-parchment">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_11rem_11rem]">
        <Field label="Title" hint={`${title.length} / ${TITLE_LIMIT}`}>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={TITLE_LIMIT} placeholder="Title" required className="text-base" />
        </Field>
        <Field label="Category" hint={NEWS_CATEGORIES.find((entry) => entry.value === category)?.description}>
          <select
            value={category}
            onChange={(event) => setCategory(Number(event.target.value))}
            className="w-full rounded-md border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-sm text-text-primary focus:border-gold-500/60 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
          >
            {NEWS_CATEGORIES.map((entry) => (
              <option key={entry.value} value={entry.value}>{entry.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Publish date">
          <Input type="date" value={dateInput(date)} onChange={(event) => event.target.value && setDate(dateSeconds(event.target.value))} required />
        </Field>
      </div>

      <Field label="Summary" className="mt-4" hint={`${summary.length} / ${SUMMARY_LIMIT} · Shown on the news cards and on the in-game welcome screen.`}>
        <textarea
          value={summary}
          maxLength={SUMMARY_LIMIT}
          rows={2}
          onChange={(event) => setSummary(event.target.value.replace(/\s*\n\s*/g, ' '))}
          placeholder="One or two sentences that sum the article up."
          className="block w-full resize-none rounded-md border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-500/60 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
        />
      </Field>

      <div className={cn('mt-6 grid gap-6', view === 'split' && 'xl:grid-cols-2')}>
        {view !== 'preview' && (
          <div className="min-w-0">
            {removed && (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-xs text-text-secondary">
                <span>Deleted a {blockMeta(removed.block.type).label.toLowerCase()} block.</span>
                <span className="flex items-center gap-1">
                  <button type="button" onClick={undoRemove} className="rounded px-2 py-1 text-gold-400 hover:bg-stone-800">Undo</button>
                  <IconButton title="Dismiss" onClick={() => setRemoved(null)}><X className="h-3.5 w-3.5" /></IconButton>
                </span>
              </div>
            )}

            {blocks.map((block, index) => {
              const meta = blockMeta(block.type)
              return (
                <Fragment key={block.id}>
                  {addingAt === index ? (
                    <div className="my-2">
                      <AddBlockMenu onPick={(type) => insertBlock(index, type)} onClose={() => setAddingAt(null)} />
                    </div>
                  ) : (
                    <div className="group/insert flex h-5 items-center justify-center">
                      <button
                        type="button"
                        title="Add a block here"
                        aria-label="Add a block here"
                        onClick={() => setAddingAt(index)}
                        className="flex items-center gap-1 rounded-full border border-stone-700 bg-stone-900 px-2 text-[11px] text-text-muted opacity-0 transition-opacity hover:text-gold-400 focus:opacity-100 group-hover/insert:opacity-100"
                      >
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    </div>
                  )}

                  <section className="rounded-md border border-stone-700 bg-stone-900/50" aria-label={`${meta.label} block`}>
                    <header className="flex items-center gap-2 border-b border-stone-800 px-3 py-1.5">
                      <meta.Icon className="h-4 w-4 text-gold-500" aria-hidden />
                      <span className="text-xs font-medium uppercase tracking-wide text-gold-400">{meta.label}</span>
                      <div className="ml-auto flex items-center gap-0.5">
                        <IconButton title="Move up" disabled={index === 0} onClick={() => moveBlock(index, -1)}><ArrowUp className="h-3.5 w-3.5" /></IconButton>
                        <IconButton title="Move down" disabled={index === blocks.length - 1} onClick={() => moveBlock(index, 1)}><ArrowDown className="h-3.5 w-3.5" /></IconButton>
                        <IconButton title="Duplicate" onClick={() => duplicateBlock(index)}><CopyPlus className="h-3.5 w-3.5" /></IconButton>
                        <IconButton title="Delete block" className="hover:text-red-400" onClick={() => removeBlock(index)}><Trash2 className="h-3.5 w-3.5" /></IconButton>
                      </div>
                    </header>
                    <div className="p-3">
                      <BlockFields block={block} onChange={(next) => updateBlock(index, next)} />
                    </div>
                  </section>
                </Fragment>
              )
            })}

            <div className="mt-3">
              {addingAt === blocks.length ? (
                <AddBlockMenu onPick={(type) => insertBlock(blocks.length, type)} onClose={() => setAddingAt(null)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingAt(blocks.length)}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-stone-700 py-3 text-sm text-text-secondary transition-colors hover:border-gold-500/50 hover:text-gold-400"
                >
                  <Plus className="h-4 w-4" /> Add block
                </button>
              )}
            </div>
          </div>
        )}

        {view !== 'edit' && (
          <div className="min-w-0">
            <div className={cn('space-y-5', view === 'split' && 'xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1')} onClickCapture={stayInEditor}>
              <div>
                <span className="mb-1.5 block text-[11px] uppercase tracking-wide text-text-muted">News card</span>
                <NewsCard article={{ id: article?.id ?? 0, title: shownTitle, category, date, summary: singleLine(summary) || 'The summary appears here.' }} />
              </div>
              <div>
                <span className="mb-1.5 block text-[11px] uppercase tracking-wide text-text-muted">Article</span>
                <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-6 sm:p-8">
                  <div className="flex items-center gap-3 text-xs">
                    <CategoryBadge category={category} />
                    <time className="text-text-muted">{formatNewsDate(date)}</time>
                  </div>
                  <h1 className="mt-4 font-adventure text-3xl uppercase tracking-wide text-gold-500">{shownTitle}</h1>
                  <div className={cn('mt-4 h-1.5 w-24 rounded-full', style.accentColor)} />
                  <div className="mt-8 leading-relaxed text-text-secondary">
                    <NewsBlocks blocks={blocks} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-stone-800 pt-4">
        <Button type="submit" size="sm" disabled={busy}>{busy ? 'Saving…' : article ? 'Save changes' : 'Publish article'}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={busy}>Cancel</Button>
        <span className="ml-auto text-xs text-text-muted">
          {dirty ? 'Unsaved changes · ' : ''}
          {body.length.toLocaleString('en-GB')} / {BODY_LIMIT.toLocaleString('en-GB')} characters · publishing is immediate
        </span>
      </div>
    </form>
  )
}
