// news articles as blocks. stored in the news table's body column as
//   <summary>\n<!--ror-news:v1-->\n<json>
// so the data server's summary (the body's first line, at most 140
// characters) stays plain text for the news cards and the in-game welcome
// screen. a body without the marker is one of the older markdown articles.
// no imports, so node --test can load it as it is

export const NEWS_MARKER = '<!--ror-news:v1-->'
export const SUMMARY_LIMIT = 140

export const ALIGNS = ['left', 'center', 'right'] as const
export const TEXT_SIZES = ['small', 'normal', 'large'] as const
export const IMAGE_WIDTHS = ['small', 'medium', 'large', 'full'] as const
export const IMAGE_POSITIONS = ['left', 'center', 'right'] as const
export const CALLOUT_TONES = ['info', 'tip', 'warning', 'danger', 'note'] as const
export const BUTTON_VARIANTS = ['primary', 'secondary'] as const
export const DIVIDER_STYLES = ['ornament', 'line'] as const
export const INLINE_SIZES = ['small', 'large', 'huge'] as const

export type Align = (typeof ALIGNS)[number]
export type TextSize = (typeof TEXT_SIZES)[number]
export type ImageWidth = (typeof IMAGE_WIDTHS)[number]
export type ImagePosition = (typeof IMAGE_POSITIONS)[number]
export type CalloutTone = (typeof CALLOUT_TONES)[number]
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number]
export type DividerStyle = (typeof DIVIDER_STYLES)[number]

export interface NewsImage {
  src: string
  alt: string
  caption: string
}

export interface NewsColumn {
  src: string
  alt: string
  text: string
}

export type NewsBlock =
  | { id: string; type: 'heading'; level: 2 | 3; text: string; align: Align }
  | { id: string; type: 'text'; text: string; align: Align; size: TextSize }
  | ({ id: string; type: 'image'; width: ImageWidth; position: ImagePosition } & NewsImage)
  | { id: string; type: 'gallery'; images: NewsImage[]; columns: 2 | 3 | 4 }
  | { id: string; type: 'list'; ordered: boolean; text: string }
  | { id: string; type: 'quote'; text: string; cite: string }
  | { id: string; type: 'callout'; tone: CalloutTone; title: string; text: string }
  | { id: string; type: 'divider'; style: DividerStyle }
  | { id: string; type: 'table'; header: boolean; rows: string[][] }
  | { id: string; type: 'columns'; columns: NewsColumn[] }
  | { id: string; type: 'button'; label: string; href: string; variant: ButtonVariant; align: Align }
  | { id: string; type: 'video'; url: string; caption: string }

export type NewsBlockType = NewsBlock['type']
export type BlockOf<T extends NewsBlockType> = Extract<NewsBlock, { type: T }>

export interface NewsDocument {
  summary: string
  blocks: NewsBlock[]
}

// static class names, so tailwind generates every one of them
export const NEWS_COLOURS = {
  gold: { label: 'Gold', swatch: '#f0c674', text: 'text-gold-400', bg: 'bg-gold-500/25' },
  yellow: { label: 'Yellow', swatch: '#fde047', text: 'text-yellow-300', bg: 'bg-yellow-400/25' },
  orange: { label: 'Orange', swatch: '#fb923c', text: 'text-orange-400', bg: 'bg-orange-500/25' },
  red: { label: 'Red', swatch: '#f87171', text: 'text-red-400', bg: 'bg-red-500/25' },
  green: { label: 'Green', swatch: '#4ade80', text: 'text-green-400', bg: 'bg-green-500/25' },
  cyan: { label: 'Cyan', swatch: '#67e8f9', text: 'text-cyan-300', bg: 'bg-cyan-400/20' },
  blue: { label: 'Blue', swatch: '#38bdf8', text: 'text-sky-400', bg: 'bg-sky-500/25' },
  purple: { label: 'Purple', swatch: '#c084fc', text: 'text-purple-400', bg: 'bg-purple-500/25' },
  pink: { label: 'Pink', swatch: '#f472b6', text: 'text-pink-400', bg: 'bg-pink-500/25' },
  white: { label: 'White', swatch: '#ffffff', text: 'text-white', bg: 'bg-white/15' },
  parchment: { label: 'Parchment', swatch: '#d8c9a3', text: 'text-parchment', bg: 'bg-parchment/20' },
  grey: { label: 'Grey', swatch: '#6e6459', text: 'text-text-muted', bg: 'bg-stone-700' },
} as const

export type NewsColour = keyof typeof NEWS_COLOURS

let blockCounter = 0

export function blockId(): string {
  blockCounter += 1
  return `b${blockCounter.toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function createBlock(type: NewsBlockType): NewsBlock {
  const id = blockId()

  switch (type) {
    case 'heading':
      return { id, type, level: 2, text: '', align: 'left' }
    case 'text':
      return { id, type, text: '', align: 'left', size: 'normal' }
    case 'image':
      return { id, type, src: '', alt: '', caption: '', width: 'full', position: 'center' }
    case 'gallery':
      return { id, type, images: [], columns: 3 }
    case 'list':
      return { id, type, ordered: false, text: '' }
    case 'quote':
      return { id, type, text: '', cite: '' }
    case 'callout':
      return { id, type, tone: 'info', title: '', text: '' }
    case 'divider':
      return { id, type, style: 'ornament' }
    case 'table':
      return { id, type, header: true, rows: [['', ''], ['', '']] }
    case 'columns':
      return { id, type, columns: [emptyColumn(), emptyColumn()] }
    case 'button':
      return { id, type, label: '', href: '', variant: 'primary', align: 'center' }
    case 'video':
      return { id, type, url: '', caption: '' }
  }
}

export function emptyColumn(): NewsColumn {
  return { src: '', alt: '', text: '' }
}

export function singleLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

// --- storage ---------------------------------------------------------------

export function isRichNews(body: string): boolean {
  return body.includes(NEWS_MARKER)
}

export function serializeNews(doc: NewsDocument): string {
  const blocks = doc.blocks.map((block) => {
    const stored: Partial<NewsBlock> = { ...block }
    delete stored.id
    return stored
  })

  return `${singleLine(doc.summary).slice(0, SUMMARY_LIMIT)}\n${NEWS_MARKER}\n${JSON.stringify({ version: 1, blocks })}`
}

export function parseNews(body: string): NewsDocument {
  const at = body.indexOf(NEWS_MARKER)

  if (at === -1) {
    return markdownToNews(body)
  }

  const summary = singleLine(body.slice(0, at))
  let blocks: NewsBlock[] = []

  try {
    const data: unknown = JSON.parse(body.slice(at + NEWS_MARKER.length))

    if (isRecord(data) && Array.isArray(data.blocks)) {
      blocks = data.blocks.map(normalizeBlock).filter((block): block is NewsBlock => block !== null)
    }
  } catch {
    // a damaged body still shows its summary
  }

  return { summary, blocks }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

function oneOf<T extends string | number>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback
}

function image(value: unknown): NewsImage {
  const raw = isRecord(value) ? value : {}
  return { src: str(raw.src, 500), alt: str(raw.alt, 300), caption: str(raw.caption, 1000) }
}

function column(value: unknown): NewsColumn {
  const raw = isRecord(value) ? value : {}
  return { src: str(raw.src, 500), alt: str(raw.alt, 300), text: str(raw.text, 20000) }
}

const MAX_TABLE_ROWS = 60
const MAX_TABLE_COLUMNS = 8

function tableRows(value: unknown): string[][] {
  const rows = (Array.isArray(value) ? value : [])
    .slice(0, MAX_TABLE_ROWS)
    .map((row) => (Array.isArray(row) ? row : []).slice(0, MAX_TABLE_COLUMNS).map((cell) => str(cell, 2000)))
  const width = Math.max(1, ...rows.map((row) => row.length))
  const padded = rows.map((row) => [...row, ...Array<string>(width - row.length).fill('')])
  return padded.length ? padded : [['']]
}

export function normalizeBlock(value: unknown): NewsBlock | null {
  if (!isRecord(value)) return null

  const id = blockId()
  const raw = value

  switch (raw.type) {
    case 'heading':
      return { id, type: 'heading', level: oneOf(raw.level, [2, 3] as const, 2), text: str(raw.text, 500), align: oneOf(raw.align, ALIGNS, 'left') }
    case 'text':
      return { id, type: 'text', text: str(raw.text, 50000), align: oneOf(raw.align, ALIGNS, 'left'), size: oneOf(raw.size, TEXT_SIZES, 'normal') }
    case 'image':
      return { id, type: 'image', ...image(raw), width: oneOf(raw.width, IMAGE_WIDTHS, 'full'), position: oneOf(raw.position, IMAGE_POSITIONS, 'center') }
    case 'gallery':
      return { id, type: 'gallery', images: (Array.isArray(raw.images) ? raw.images : []).slice(0, 24).map(image), columns: oneOf(raw.columns, [2, 3, 4] as const, 3) }
    case 'list':
      return { id, type: 'list', ordered: raw.ordered === true, text: str(raw.text, 20000) }
    case 'quote':
      return { id, type: 'quote', text: str(raw.text, 5000), cite: str(raw.cite, 200) }
    case 'callout':
      return { id, type: 'callout', tone: oneOf(raw.tone, CALLOUT_TONES, 'info'), title: str(raw.title, 200), text: str(raw.text, 10000) }
    case 'divider':
      return { id, type: 'divider', style: oneOf(raw.style, DIVIDER_STYLES, 'ornament') }
    case 'table':
      return { id, type: 'table', header: raw.header !== false, rows: tableRows(raw.rows) }
    case 'columns': {
      const columns = (Array.isArray(raw.columns) ? raw.columns : []).slice(0, 3).map(column)
      while (columns.length < 2) columns.push(emptyColumn())
      return { id, type: 'columns', columns }
    }
    case 'button':
      return { id, type: 'button', label: str(raw.label, 120), href: str(raw.href, 500), variant: oneOf(raw.variant, BUTTON_VARIANTS, 'primary'), align: oneOf(raw.align, ALIGNS, 'center') }
    case 'video':
      return { id, type: 'video', url: str(raw.url, 500), caption: str(raw.caption, 1000) }
    default:
      return null
  }
}

// --- inline markup ---------------------------------------------------------
// [b] [i] [u] [s] [code] [color=gold|#rrggbb] [bg=…] [size=small|large|huge]
// [url=https://…] [wiki=Page] [item=id]Name[/item]. tags nest; a stray
// closing tag stays as text, and an unclosed one runs to the end

export const INLINE_TAGS = ['b', 'i', 'u', 's', 'code', 'color', 'bg', 'size', 'url', 'wiki', 'item'] as const
export type InlineTag = (typeof INLINE_TAGS)[number]

export type InlineNode =
  | { kind: 'text'; text: string }
  | { kind: 'tag'; tag: InlineTag; value: string; children: InlineNode[] }

type TagNode = Extract<InlineNode, { kind: 'tag' }>

const TAG_PATTERN = /\[(\/?)(b|i|u|s|code|color|bg|size|url|wiki|item)(?:=([^\]\n]{1,500}))?\]/gi

export function parseInline(source: string): InlineNode[] {
  const root: TagNode = { kind: 'tag', tag: 'b', value: '', children: [] }
  const stack: TagNode[] = [root]
  let last = 0

  const pushText = (text: string) => {
    if (!text) return
    const children = stack[stack.length - 1].children
    const previous = children[children.length - 1]
    if (previous?.kind === 'text') previous.text += text
    else children.push({ kind: 'text', text })
  }

  for (const match of source.matchAll(TAG_PATTERN)) {
    const index = match.index ?? 0
    pushText(source.slice(last, index))
    last = index + match[0].length

    const tag = match[2].toLowerCase() as InlineTag

    if (match[1]) {
      let depth = -1
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i].tag === tag) {
          depth = i
          break
        }
      }

      if (depth === -1) pushText(match[0])
      else stack.length = depth
      continue
    }

    const node: TagNode = { kind: 'tag', tag, value: (match[3] ?? '').trim(), children: [] }
    stack[stack.length - 1].children.push(node)
    stack.push(node)
  }

  pushText(source.slice(last))
  return root.children
}

export function inlineText(nodes: InlineNode[]): string {
  return nodes.map((node) => (node.kind === 'text' ? node.text : inlineText(node.children))).join('')
}

export function plainText(source: string): string {
  return inlineText(parseInline(source))
}

export function colourClass(value: string, kind: 'text' | 'bg'): string | null {
  const key = value.trim().toLowerCase()
  return Object.hasOwn(NEWS_COLOURS, key) ? NEWS_COLOURS[key as NewsColour][kind] : null
}

export function colourHex(value: string): string | null {
  const key = value.trim().toLowerCase()
  return /^#[0-9a-f]{6}$/.test(key) ? key : null
}

// --- links -----------------------------------------------------------------

export function safeHref(value: string): string | null {
  const url = value.trim()
  if (/^https?:\/\/[^\s"'<>]+$/i.test(url)) return url
  if (/^\/(?![/\\])[^\s"'<>]*$/.test(url)) return url
  return null
}

// uploads and the site's own pictures only
export function safeImageSrc(value: string): string | null {
  const src = value.trim()
  return /^\/(?![/\\])[^\s"'<>]*$/.test(src) ? src : null
}

export function youtubeId(value: string): string | null {
  const match = value
    .trim()
    .match(/^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})(?:[?&#].*)?$/i)
  return match ? match[1] : null
}

export function wikiHref(page: string): string {
  return `/wiki/search?q=${encodeURIComponent(singleLine(page))}`
}

export function itemId(value: string): number | null {
  return /^\d{1,5}$/.test(value.trim()) ? Number(value.trim()) : null
}

// --- the older markdown articles --------------------------------------------

const MD_INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g
const MD_IMAGE = /!\[([^\]]*)\]\(([^)\s]+)\)/g

export function markdownInline(text: string): string {
  return text
    .split(MD_INLINE)
    .map((part) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) return `[b]${part.slice(2, -2)}[/b]`
      if (/^\*[^*]+\*$/.test(part)) return `[i]${part.slice(1, -1)}[/i]`
      if (/^`[^`]+`$/.test(part)) return `[code]${part.slice(1, -1)}[/code]`
      const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
      if (link) return `[url=${link[2]}]${link[1]}[/url]`
      return part
    })
    .join('')
}

function markdownSummary(body: string): string {
  const first = body.trim().split('\n')[0] ?? ''
  const line = first.replace(/^(#{1,6}|>|[-*]|\d+\.)\s+/, '').replace(MD_IMAGE, '')
  return singleLine(plainText(markdownInline(line))).slice(0, SUMMARY_LIMIT)
}

// GitHub's alert names, plus the editor's own
const MD_CALLOUTS: Record<string, CalloutTone> = {
  NOTE: 'note',
  INFO: 'info',
  IMPORTANT: 'info',
  TIP: 'tip',
  WARNING: 'warning',
  CAUTION: 'danger',
  DANGER: 'danger',
}

const MD_TABLE_ROW = /^\s*\|.*\|\s*$/
const MD_TABLE_RULE = /^\s*\|(\s*:?-{3,}:?\s*\|)+\s*$/

function markdownCells(line: string): string[] {
  return line.trim().slice(1, -1).split('|').map((cell) => markdownInline(cell.trim()))
}

export function markdownToNews(body: string): NewsDocument {
  const blocks: NewsBlock[] = []

  const addText = (text: string) => {
    const value = text.trim()
    if (!value) return
    const previous = blocks[blocks.length - 1]
    if (previous?.type === 'text') previous.text += `\n\n${value}`
    else blocks.push({ id: blockId(), type: 'text', text: value, align: 'left', size: 'normal' })
  }

  for (const chunk of body.trim().split(/\n{2,}/)) {
    if (!chunk.trim()) continue

    const lines = chunk.split('\n')
    const first = lines[0]

    if (lines.every((line) => /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line))) {
      blocks.push({ id: blockId(), type: 'divider', style: 'ornament' })
      continue
    }

    const callout = first.match(/^>\s*\[!(\w+)\]\s*(.*)$/)
    if (callout && MD_CALLOUTS[callout[1].toUpperCase()]) {
      const text = lines.slice(1).map((line) => line.replace(/^>\s?/, '')).join('\n')
      blocks.push({ id: blockId(), type: 'callout', tone: MD_CALLOUTS[callout[1].toUpperCase()], title: markdownInline(callout[2]), text: markdownInline(text) })
      continue
    }

    if (lines.length >= 2 && lines.every((line) => MD_TABLE_ROW.test(line)) && MD_TABLE_RULE.test(lines[1])) {
      const table = normalizeBlock({ type: 'table', header: true, rows: [markdownCells(first), ...lines.slice(2).map(markdownCells)] })
      if (table) blocks.push(table)
      continue
    }

    const heading = first.match(/^(#{1,3}) (.*)$/)

    if (heading) {
      blocks.push({ id: blockId(), type: 'heading', level: heading[1].length === 3 ? 3 : 2, text: markdownInline(heading[2]), align: 'left' })
      addText(markdownInline(lines.slice(1).join(' ')))
      continue
    }

    if (lines.every((line) => /^[-*] /.test(line))) {
      blocks.push({ id: blockId(), type: 'list', ordered: false, text: lines.map((line) => markdownInline(line.slice(2))).join('\n') })
      continue
    }

    if (lines.every((line) => /^\d+\. /.test(line))) {
      blocks.push({ id: blockId(), type: 'list', ordered: true, text: lines.map((line) => markdownInline(line.replace(/^\d+\. /, ''))).join('\n') })
      continue
    }

    if (first.startsWith('> ')) {
      blocks.push({ id: blockId(), type: 'quote', text: markdownInline(lines.map((line) => line.replace(/^> ?/, '')).join(' ')), cite: '' })
      continue
    }

    const paragraph = lines.join(' ')
    const pictures = [...paragraph.matchAll(MD_IMAGE)].filter((match) => safeImageSrc(match[2]))

    if (pictures.length >= 2 && !paragraph.replace(MD_IMAGE, '').trim()) {
      const images = pictures.map((match) => ({ src: match[2], alt: match[1], caption: '' }))
      blocks.push({ id: blockId(), type: 'gallery', images, columns: images.length >= 3 ? 3 : 2 })
      continue
    }

    let last = 0

    for (const match of paragraph.matchAll(MD_IMAGE)) {
      const index = match.index ?? 0
      const src = safeImageSrc(match[2])
      if (!src) continue

      addText(markdownInline(paragraph.slice(last, index)))
      blocks.push({ id: blockId(), type: 'image', src, alt: match[1], caption: '', width: 'full', position: 'center' })
      last = index + match[0].length
    }

    addText(markdownInline(paragraph.slice(last)))
  }

  return { summary: markdownSummary(body), blocks }
}
