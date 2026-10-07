'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Columns2,
  Heading,
  Image as ImageIcon,
  Images,
  Info,
  List,
  Minus,
  MousePointerClick,
  Pilcrow,
  Plus,
  Quote,
  SquarePlay,
  Table,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react'

import { Input } from '@/components/ui/Input'
import { uploadNewsImage } from '@/lib/api'
import { emptyColumn, safeHref, safeImageSrc, youtubeId, type NewsBlock, type NewsBlockType } from '@/lib/news-format'
import { cn } from '@/lib/utils'
import { ALIGN_OPTIONS, Field, IconButton, Segmented, SmallButton, uploadErrorMessage } from './fields'
import { altFromFile, IMAGE_TYPES, ImageField } from './ImageField'
import { RichTextField } from './RichTextField'

export const BLOCK_TYPES: { type: NewsBlockType; label: string; description: string; Icon: LucideIcon }[] = [
  { type: 'heading', label: 'Heading', description: 'A section title', Icon: Heading },
  { type: 'text', label: 'Text', description: 'Paragraphs with styling', Icon: Pilcrow },
  { type: 'image', label: 'Image', description: 'One picture, sized and placed', Icon: ImageIcon },
  { type: 'gallery', label: 'Gallery', description: 'Pictures side by side', Icon: Images },
  { type: 'list', label: 'List', description: 'Bullets or numbers', Icon: List },
  { type: 'quote', label: 'Quote', description: 'A quotation', Icon: Quote },
  { type: 'callout', label: 'Callout', description: 'A coloured box for notes', Icon: Info },
  { type: 'table', label: 'Table', description: 'Rows and columns', Icon: Table },
  { type: 'columns', label: 'Columns', description: 'Two or three side by side', Icon: Columns2 },
  { type: 'button', label: 'Button', description: 'A link styled as a button', Icon: MousePointerClick },
  { type: 'video', label: 'Video', description: 'A YouTube video', Icon: SquarePlay },
  { type: 'divider', label: 'Divider', description: 'A break between sections', Icon: Minus },
]

export function blockMeta(type: NewsBlockType) {
  return BLOCK_TYPES.find((entry) => entry.type === type) ?? BLOCK_TYPES[1]
}

const MAX_TABLE_ROWS = 60
const MAX_TABLE_COLUMNS = 8

function GalleryFields({ block, onChange }: { block: Extract<NewsBlock, { type: 'gallery' }>; onChange: (block: NewsBlock) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setImage = (index: number, patch: Partial<(typeof block.images)[number]>) => {
    onChange({ ...block, images: block.images.map((image, i) => (i === index ? { ...image, ...patch } : image)) })
  }

  const move = (index: number, by: number) => {
    const images = [...block.images]
    const [image] = images.splice(index, 1)
    images.splice(index + by, 0, image)
    onChange({ ...block, images })
  }

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return

    setBusy(true)
    setError(null)
    const added: (typeof block.images)[number][] = []

    try {
      for (const file of files.slice(0, 24 - block.images.length)) {
        const result = await uploadNewsImage(file)
        added.push({ src: result.url, alt: altFromFile(file.name), caption: '' })
      }
    } catch (uploadError) {
      setError(uploadErrorMessage(uploadError))
    } finally {
      if (added.length) onChange({ ...block, images: [...block.images, ...added] })
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Pictures per row">
        <Segmented label="Pictures per row" value={block.columns} onChange={(columns) => onChange({ ...block, columns })} options={[{ value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }]} />
      </Field>

      {block.images.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {block.images.map((image, index) => (
            <div key={`${image.src}-${index}`} className="space-y-2 rounded-md border border-stone-800 bg-stone-950/60 p-2">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- news images are uploads served by the API */}
                {safeImageSrc(image.src) && <img src={image.src} alt="" className="aspect-video w-full rounded object-cover" />}
                <div className="absolute right-1 top-1 flex gap-0.5 rounded bg-stone-950/90">
                  <IconButton title="Move earlier" disabled={index === 0} onClick={() => move(index, -1)}><ChevronLeft className="h-3.5 w-3.5" /></IconButton>
                  <IconButton title="Move later" disabled={index === block.images.length - 1} onClick={() => move(index, 1)}><ChevronRight className="h-3.5 w-3.5" /></IconButton>
                  <IconButton title="Remove picture" onClick={() => onChange({ ...block, images: block.images.filter((_, i) => i !== index) })}><Trash2 className="h-3.5 w-3.5" /></IconButton>
                </div>
              </div>
              <Input value={image.alt} onChange={(event) => setImage(index, { alt: event.target.value })} placeholder="Alt text" className="px-2.5 py-1.5 text-xs" />
              <RichTextField compact rows={1} label="Caption" value={image.caption} onChange={(caption) => setImage(index, { caption })} placeholder="Caption (optional)" />
            </div>
          ))}
        </div>
      )}

      <input ref={inputRef} type="file" accept={IMAGE_TYPES} multiple onChange={upload} className="sr-only" tabIndex={-1} />
      <SmallButton onClick={() => inputRef.current?.click()} disabled={busy || block.images.length >= 24}>
        <Upload className="h-3.5 w-3.5" />
        {busy ? 'Uploading…' : 'Add pictures'}
      </SmallButton>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

function TableFields({ block, onChange }: { block: Extract<NewsBlock, { type: 'table' }>; onChange: (block: NewsBlock) => void }) {
  const width = block.rows[0]?.length ?? 1

  const setCell = (row: number, column: number, value: string) => {
    onChange({ ...block, rows: block.rows.map((cells, r) => (r === row ? cells.map((cell, c) => (c === column ? value : cell)) : cells)) })
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs text-text-secondary">
        <input type="checkbox" checked={block.header} onChange={(event) => onChange({ ...block, header: event.target.checked })} className="accent-gold-500" />
        First row is a header
      </label>

      {/* no scrolling wrapper: it would clip the cells' floating toolbars */}
      <table className="w-full table-fixed border-separate border-spacing-1">
        <thead>
          <tr>
            {Array.from({ length: width }, (_, column) => (
              <th key={column} className="text-right font-normal">
                <IconButton title="Remove column" disabled={width === 1} onClick={() => onChange({ ...block, rows: block.rows.map((cells) => cells.filter((_, c) => c !== column)) })}>
                  <X className="h-3 w-3" />
                </IconButton>
              </th>
            ))}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {block.rows.map((cells, row) => (
            <tr key={row}>
              {cells.map((cell, column) => (
                <td key={column} className={cn('align-top', block.header && row === 0 && '[&_textarea]:font-semibold [&_textarea]:text-gold-400')}>
                  <RichTextField compact rows={1} label={`Row ${row + 1}, column ${column + 1}`} value={cell} onChange={(value) => setCell(row, column, value)} />
                </td>
              ))}
              <td className="w-8 align-top">
                <IconButton title="Remove row" disabled={block.rows.length === 1} onClick={() => onChange({ ...block, rows: block.rows.filter((_, r) => r !== row) })}>
                  <X className="h-3 w-3" />
                </IconButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap gap-2">
        <SmallButton disabled={block.rows.length >= MAX_TABLE_ROWS} onClick={() => onChange({ ...block, rows: [...block.rows, Array<string>(width).fill('')] })}>
          <Plus className="h-3.5 w-3.5" /> Row
        </SmallButton>
        <SmallButton disabled={width >= MAX_TABLE_COLUMNS} onClick={() => onChange({ ...block, rows: block.rows.map((cells) => [...cells, '']) })}>
          <Plus className="h-3.5 w-3.5" /> Column
        </SmallButton>
      </div>
    </div>
  )
}

export function BlockFields({ block, onChange }: { block: NewsBlock; onChange: (block: NewsBlock) => void }) {
  switch (block.type) {
    case 'heading':
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4">
            <Field label="Level">
              <Segmented label="Heading level" value={block.level} onChange={(level) => onChange({ ...block, level })} options={[{ value: 2, label: 'Section' }, { value: 3, label: 'Subsection' }]} />
            </Field>
            <Field label="Align">
              <Segmented label="Alignment" value={block.align} onChange={(align) => onChange({ ...block, align })} options={ALIGN_OPTIONS} />
            </Field>
          </div>
          <RichTextField rows={1} label="Heading" value={block.text} onChange={(text) => onChange({ ...block, text })} placeholder="Heading" />
        </div>
      )

    case 'text':
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4">
            <Field label="Size">
              <Segmented label="Text size" value={block.size} onChange={(size) => onChange({ ...block, size })} options={[{ value: 'small', label: 'Small' }, { value: 'normal', label: 'Normal' }, { value: 'large', label: 'Lead' }]} />
            </Field>
            <Field label="Align">
              <Segmented label="Alignment" value={block.align} onChange={(align) => onChange({ ...block, align })} options={ALIGN_OPTIONS} />
            </Field>
          </div>
          <Field label="Text" hint="Leave a blank line between paragraphs. Select words, then style them with the toolbar.">
            <RichTextField rows={4} label="Text" value={block.text} onChange={(text) => onChange({ ...block, text })} placeholder="Write something…" />
          </Field>
        </div>
      )

    case 'image':
      return (
        <div className="space-y-3">
          <ImageField src={block.src} alt={block.alt} onChange={(image) => onChange({ ...block, ...image })} />
          <div className="flex flex-wrap gap-4">
            <Field label="Width">
              <Segmented label="Width" value={block.width} onChange={(width) => onChange({ ...block, width })} options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Half' }, { value: 'large', label: 'Large' }, { value: 'full', label: 'Full' }]} />
            </Field>
            {block.width !== 'full' && (
              <Field label="Position" hint={block.position === 'center' ? undefined : 'The blocks after it wrap round the picture.'}>
                <Segmented label="Position" value={block.position} onChange={(position) => onChange({ ...block, position })} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }, { value: 'right', label: 'Right' }]} />
              </Field>
            )}
          </div>
          <Field label="Caption">
            <RichTextField compact rows={1} label="Caption" value={block.caption} onChange={(caption) => onChange({ ...block, caption })} placeholder="Caption (optional)" />
          </Field>
        </div>
      )

    case 'gallery':
      return <GalleryFields block={block} onChange={onChange} />

    case 'list':
      return (
        <div className="space-y-3">
          <Field label="Style">
            <Segmented label="List style" value={block.ordered} onChange={(ordered) => onChange({ ...block, ordered })} options={[{ value: false, label: 'Bullets' }, { value: true, label: 'Numbers' }]} />
          </Field>
          <Field label="Items" hint="One item per line.">
            <RichTextField rows={4} label="List items" value={block.text} onChange={(text) => onChange({ ...block, text })} placeholder={'First item\nSecond item'} />
          </Field>
        </div>
      )

    case 'quote':
      return (
        <div className="space-y-3">
          <RichTextField rows={2} label="Quote" value={block.text} onChange={(text) => onChange({ ...block, text })} placeholder="The quotation" />
          <Field label="Said by">
            <RichTextField compact rows={1} label="Said by" value={block.cite} onChange={(cite) => onChange({ ...block, cite })} placeholder="Who said it (optional)" />
          </Field>
        </div>
      )

    case 'callout':
      return (
        <div className="space-y-3">
          <Field label="Style">
            <Segmented
              label="Callout style"
              value={block.tone}
              onChange={(tone) => onChange({ ...block, tone })}
              options={[
                { value: 'info', label: <span className="text-rune-blue">Info</span> },
                { value: 'tip', label: <span className="text-moss">Tip</span> },
                { value: 'warning', label: <span className="text-gold-400">Warning</span> },
                { value: 'danger', label: <span className="text-red-400">Danger</span> },
                { value: 'note', label: <span className="text-parchment">Note</span> },
              ]}
            />
          </Field>
          <Field label="Title">
            <RichTextField compact rows={1} label="Callout title" value={block.title} onChange={(title) => onChange({ ...block, title })} placeholder="Title (optional)" />
          </Field>
          <RichTextField rows={3} label="Callout text" value={block.text} onChange={(text) => onChange({ ...block, text })} placeholder="What players should know" />
        </div>
      )

    case 'divider':
      return (
        <Field label="Style">
          <Segmented label="Divider style" value={block.style} onChange={(style) => onChange({ ...block, style })} options={[{ value: 'ornament', label: 'Ornament' }, { value: 'line', label: 'Line' }]} />
        </Field>
      )

    case 'table':
      return <TableFields block={block} onChange={onChange} />

    case 'columns':
      return (
        <div className="space-y-3">
          <Field label="Columns">
            <Segmented
              label="Number of columns"
              value={block.columns.length}
              onChange={(count) => onChange({ ...block, columns: count === 3 ? [...block.columns.slice(0, 3), ...Array.from({ length: 3 - block.columns.length }, emptyColumn)] : block.columns.slice(0, 2) })}
              options={[{ value: 2, label: '2' }, { value: 3, label: '3' }]}
            />
          </Field>
          <div className={cn('grid gap-3', block.columns.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2')}>
            {block.columns.map((column, index) => (
              <div key={index} className="space-y-2 rounded-md border border-stone-800 bg-stone-950/60 p-2">
                <span className="block text-[11px] uppercase tracking-wide text-text-muted">Column {index + 1}</span>
                <ImageField src={column.src} alt={column.alt} onChange={(image) => onChange({ ...block, columns: block.columns.map((c, i) => (i === index ? { ...c, ...image } : c)) })} />
                <RichTextField rows={3} label={`Column ${index + 1} text`} value={column.text} onChange={(text) => onChange({ ...block, columns: block.columns.map((c, i) => (i === index ? { ...c, text } : c)) })} placeholder="Text" />
              </div>
            ))}
          </div>
        </div>
      )

    case 'button': {
      const badLink = block.href.trim() !== '' && !safeHref(block.href)
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Label">
              <Input value={block.label} maxLength={120} onChange={(event) => onChange({ ...block, label: event.target.value })} placeholder="Play now" className="px-2.5 py-1.5" />
            </Field>
            <Field label="Link" hint={badLink ? <span className="text-red-400">Use a full https:// address, or a path on this site such as /play.</span> : undefined}>
              <Input value={block.href} onChange={(event) => onChange({ ...block, href: event.target.value })} placeholder="https://… or /play" className="px-2.5 py-1.5" />
            </Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <Field label="Style">
              <Segmented label="Button style" value={block.variant} onChange={(variant) => onChange({ ...block, variant })} options={[{ value: 'primary', label: 'Gold' }, { value: 'secondary', label: 'Stone' }]} />
            </Field>
            <Field label="Align">
              <Segmented label="Alignment" value={block.align} onChange={(align) => onChange({ ...block, align })} options={ALIGN_OPTIONS} />
            </Field>
          </div>
        </div>
      )
    }

    case 'video': {
      const badVideo = block.url.trim() !== '' && !youtubeId(block.url)
      return (
        <div className="space-y-3">
          <Field label="YouTube link" hint={badVideo ? <span className="text-red-400">That isn&apos;t a YouTube video link.</span> : undefined}>
            <Input value={block.url} onChange={(event) => onChange({ ...block, url: event.target.value })} placeholder="https://www.youtube.com/watch?v=…" className="px-2.5 py-1.5" />
          </Field>
          <Field label="Caption">
            <RichTextField compact rows={1} label="Video caption" value={block.caption} onChange={(caption) => onChange({ ...block, caption })} placeholder="Caption (optional)" />
          </Field>
        </div>
      )
    }
  }
}
