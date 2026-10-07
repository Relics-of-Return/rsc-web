'use client'

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Bold, BookOpen, Code, Highlighter, Italic, Link, Package, Palette, RemoveFormatting, Strikethrough, Type, Underline } from 'lucide-react'

import { NEWS_COLOURS, safeHref, singleLine, type NewsColour } from '@/lib/news-format'
import { cn } from '@/lib/utils'

type Panel = 'color' | 'bg' | 'size' | 'link' | 'wiki' | 'item'

interface ItemOption {
  id: number
  name: string
}

const ANY_TAG = /\[\/?(?:b|i|u|s|code|color|bg|size|url|wiki|item)(?:=[^\]\n]*)?\]/gi

let itemsRequest: Promise<ItemOption[]> | null = null

function loadItems(): Promise<ItemOption[]> {
  itemsRequest ??= fetch('/api/news/items')
    .then((response) => (response.ok ? response.json() : { items: [] }))
    .then((data: { items?: ItemOption[] }) => data.items ?? [])
    .catch(() => {
      itemsRequest = null
      return []
    })

  return itemsRequest
}

function ToolButton({ title, active, onClick, children }: { title: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      // keep the caret and selection in the textarea
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        'rounded p-1.5 transition-colors',
        active ? 'bg-gold-500/20 text-gold-400' : 'text-text-secondary hover:bg-stone-800 hover:text-gold-400'
      )}
    >
      {children}
    </button>
  )
}

interface RichTextFieldProps {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  rows?: number
  /** A floating toolbar that opens on a selection or the Aa button: for captions and table cells. */
  compact?: boolean
}

export function RichTextField({ value, onChange, label, placeholder, rows = 3, compact = false }: RichTextFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selection = useRef({ start: 0, end: 0 })
  const [panel, setPanel] = useState<Panel | null>(null)
  const [floating, setFloating] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [hex, setHex] = useState('#f0c674')
  const [link, setLink] = useState('')
  const [page, setPage] = useState('')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<ItemOption[] | null>(null)

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight + 2}px`
  }, [value])

  useEffect(() => {
    if (panel !== 'item' || items) return
    let live = true
    loadItems().then((list) => {
      if (live) setItems(list)
    })
    return () => {
      live = false
    }
  }, [panel, items])

  const remember = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    selection.current = { start: textarea.selectionStart, end: textarea.selectionEnd }
    if (compact && textarea.selectionStart !== textarea.selectionEnd) setFloating(true)
  }

  const range = () => {
    const start = Math.min(selection.current.start, value.length)
    const end = Math.min(Math.max(selection.current.end, start), value.length)
    return { start, end, selected: value.slice(start, end) }
  }

  const replace = (start: number, end: number, text: string, selectFrom: number, selectTo: number) => {
    onChange(value.slice(0, start) + text + value.slice(end))
    selection.current = { start: start + selectFrom, end: start + selectTo }
    requestAnimationFrame(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      textarea.focus()
      textarea.setSelectionRange(start + selectFrom, start + selectTo)
    })
  }

  const wrap = (open: string, close: string, fallback = 'text') => {
    const { start, end, selected } = range()
    const inner = selected || fallback
    replace(start, end, `${open}${inner}${close}`, open.length, open.length + inner.length)
    setPanel(null)
  }

  const insert = (text: string) => {
    const { start, end } = range()
    replace(start, end, text, text.length, text.length)
    setPanel(null)
  }

  const clearFormatting = () => {
    const { start, end, selected } = range()
    if (!selected) return
    const plain = selected.replace(ANY_TAG, '')
    replace(start, end, plain, 0, plain.length)
  }

  const toggle = (next: Panel) => {
    setPanelError(null)
    if (next === 'wiki') setPage(singleLine(range().selected))
    setPanel((current) => (current === next ? null : next))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape' && (panel || floating)) {
      setPanel(null)
      setFloating(false)
      return
    }

    if (!(event.ctrlKey || event.metaKey) || event.altKey) return
    const key = event.key.toLowerCase()

    if (key === 'b' || key === 'i' || key === 'u') {
      event.preventDefault()
      remember()
      wrap(`[${key}]`, `[/${key}]`)
    }
  }

  const applyLink = () => {
    const href = safeHref(link)
    if (!href) {
      setPanelError('Use a full https:// address, or a path on this site such as /hiscores.')
      return
    }
    wrap(`[url=${href}]`, '[/url]', 'link text')
  }

  const applyWiki = () => {
    const target = singleLine(page).replace(/[\]\[]/g, '')
    const { selected } = range()
    if (!target && !selected) {
      setPanelError('Name the wiki page, or select the words to link.')
      return
    }
    wrap(target && target !== selected ? `[wiki=${target}]` : '[wiki]', '[/wiki]', target)
  }

  const term = query.trim().toLowerCase()
  const matches = (items ?? []).filter((item) => !term || item.name.toLowerCase().includes(term)).slice(0, 48)

  const toolbar = (
    <div
      className={cn('flex flex-wrap items-center gap-0.5 bg-stone-900/80 px-1 py-1', !compact && 'rounded-t-md border-b border-stone-800', compact && panel && 'border-b border-stone-800')}
    >
      <ToolButton title="Bold (Ctrl+B)" onClick={() => wrap('[b]', '[/b]')}><Bold className="h-3.5 w-3.5" /></ToolButton>
      <ToolButton title="Italic (Ctrl+I)" onClick={() => wrap('[i]', '[/i]')}><Italic className="h-3.5 w-3.5" /></ToolButton>
      <ToolButton title="Underline (Ctrl+U)" onClick={() => wrap('[u]', '[/u]')}><Underline className="h-3.5 w-3.5" /></ToolButton>
      <ToolButton title="Strikethrough" onClick={() => wrap('[s]', '[/s]')}><Strikethrough className="h-3.5 w-3.5" /></ToolButton>
      <ToolButton title="Code" onClick={() => wrap('[code]', '[/code]', 'code')}><Code className="h-3.5 w-3.5" /></ToolButton>
      <span className="mx-1 h-4 w-px bg-stone-700" />
      <ToolButton title="Text colour" active={panel === 'color'} onClick={() => toggle('color')}><Palette className="h-3.5 w-3.5" /></ToolButton>
      <ToolButton title="Highlight" active={panel === 'bg'} onClick={() => toggle('bg')}><Highlighter className="h-3.5 w-3.5" /></ToolButton>
      <ToolButton title="Text size" active={panel === 'size'} onClick={() => toggle('size')}><Type className="h-3.5 w-3.5" /></ToolButton>
      <span className="mx-1 h-4 w-px bg-stone-700" />
      <ToolButton title="Link" active={panel === 'link'} onClick={() => toggle('link')}><Link className="h-3.5 w-3.5" /></ToolButton>
      <ToolButton title="Wiki link" active={panel === 'wiki'} onClick={() => toggle('wiki')}><BookOpen className="h-3.5 w-3.5" /></ToolButton>
      <ToolButton title="Item icon" active={panel === 'item'} onClick={() => toggle('item')}><Package className="h-3.5 w-3.5" /></ToolButton>
      <span className="mx-1 h-4 w-px bg-stone-700" />
      <ToolButton title="Clear formatting from the selection" onClick={clearFormatting}><RemoveFormatting className="h-3.5 w-3.5" /></ToolButton>
    </div>
  )

  const panelInput = 'min-w-0 flex-1 rounded border border-stone-700 bg-stone-950 px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:border-gold-500/60 focus:outline-none'
  const panelButton = 'rounded border border-gold-500/40 px-2.5 py-1 text-xs text-gold-400 hover:bg-gold-500/10'

  const panelBody = panel && (
    <div className="space-y-2 border-b border-stone-800 bg-stone-900/60 px-2 py-2">
      {(panel === 'color' || panel === 'bg') && (
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(NEWS_COLOURS) as NewsColour[]).map((key) => (
            <button
              key={key}
              type="button"
              title={NEWS_COLOURS[key].label}
              aria-label={NEWS_COLOURS[key].label}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => wrap(`[${panel}=${key}]`, `[/${panel}]`)}
              className="h-6 w-6 rounded border border-stone-600 transition-transform hover:scale-110"
              style={{ backgroundColor: NEWS_COLOURS[key].swatch }}
            />
          ))}
          <span className="mx-1 h-5 w-px bg-stone-700" />
          <input type="color" value={hex} onChange={(event) => setHex(event.target.value)} aria-label="Custom colour" className="h-6 w-8 cursor-pointer rounded border border-stone-600 bg-transparent" />
          <button type="button" className={panelButton} onClick={() => wrap(`[${panel}=${hex}]`, `[/${panel}]`)}>
            Use {hex}
          </button>
        </div>
      )}

      {panel === 'size' && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={panelButton} onMouseDown={(event) => event.preventDefault()} onClick={() => wrap('[size=small]', '[/size]')}><span className="text-[0.85em]">Small</span></button>
          <button type="button" className={panelButton} onMouseDown={(event) => event.preventDefault()} onClick={() => wrap('[size=large]', '[/size]')}><span className="text-[1.15em]">Large</span></button>
          <button type="button" className={panelButton} onMouseDown={(event) => event.preventDefault()} onClick={() => wrap('[size=huge]', '[/size]')}><span className="text-[1.35em] leading-none">Huge</span></button>
        </div>
      )}

      {panel === 'link' && (
        <div className="flex items-center gap-1.5">
          <input autoFocus value={link} onChange={(event) => setLink(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && applyLink()} placeholder="https://… or /hiscores" className={panelInput} />
          <button type="button" className={panelButton} onClick={applyLink}>Link</button>
        </div>
      )}

      {panel === 'wiki' && (
        <div className="flex items-center gap-1.5">
          <input autoFocus value={page} onChange={(event) => setPage(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && applyWiki()} placeholder="Wiki page, e.g. Varrock" className={panelInput} />
          <button type="button" className={panelButton} onClick={applyWiki}>Link to wiki</button>
        </div>
      )}

      {panel === 'item' && (
        <div className="space-y-2">
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search items, e.g. rune scimitar" className={cn(panelInput, 'w-full')} />
          {items === null ? (
            <p className="text-xs text-text-muted">Loading items…</p>
          ) : matches.length === 0 ? (
            <p className="text-xs text-text-muted">No items match.</p>
          ) : (
            <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
              {matches.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => insert(`[item=${item.id}]${item.name}[/item]`)}
                  className="flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs text-text-secondary hover:bg-stone-800 hover:text-gold-400"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- the game's item icons are static files */}
                  <img src={`/items/${item.id}.png`} alt="" loading="lazy" className="h-6 w-auto shrink-0" />
                  <span className="truncate">{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {panelError && <p className="text-xs text-red-400">{panelError}</p>}
    </div>
  )

  return (
    <div
      // a compact field's toolbar floats: hiding it when the field is left must not move the page under the pointer
      onBlur={(event) => {
        if (compact && !event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPanel(null)
          setFloating(false)
        }
      }}
      className="group/field relative rounded-md border border-stone-700 bg-stone-950 focus-within:border-gold-500/60 focus-within:ring-2 focus-within:ring-gold-500/20"
    >
      {!compact && toolbar}
      {!compact && panelBody}
      <textarea
        ref={textareaRef}
        aria-label={label}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onSelect={remember}
        onKeyDown={onKeyDown}
        className={cn(
          'block w-full resize-none overflow-hidden bg-transparent px-3 py-2 text-sm leading-relaxed text-text-primary placeholder:text-text-muted focus:outline-none',
          compact && 'pr-9'
        )}
      />
      {compact && (
        <button
          type="button"
          title="Formatting"
          aria-label="Formatting"
          aria-pressed={floating}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setFloating((open) => !open)}
          className={cn(
            'absolute right-1 top-1 hidden rounded px-1.5 py-1 text-[11px] font-semibold group-focus-within/field:block',
            floating ? 'bg-gold-500/20 text-gold-400' : 'text-text-muted hover:text-gold-400'
          )}
        >
          Aa
        </button>
      )}
      {compact && floating && (
        <div className="absolute bottom-full left-0 z-30 mb-1 w-max max-w-[24rem] overflow-hidden rounded-md border border-stone-700 bg-stone-900 shadow-xl shadow-black/50">
          {toolbar}
          {panelBody}
        </div>
      )}
    </div>
  )
}
