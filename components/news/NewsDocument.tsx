import { Info, Lightbulb, OctagonAlert, StickyNote, TriangleAlert } from 'lucide-react'

import { cn } from '@/lib/utils'
import { safeHref, safeImageSrc, youtubeId, type NewsBlock } from '@/lib/news-format'
import { NewsGallery } from './NewsGallery'
import { RichInline, RichParagraphs } from './NewsRichText'

const ALIGN = { left: '', center: 'text-center', right: 'text-right' } as const
const TEXT_SIZE = { small: 'text-sm', normal: '', large: 'text-lg text-text-primary' } as const
const IMAGE_WIDTH = { small: 'sm:w-1/3', medium: 'sm:w-1/2', large: 'sm:w-3/4', full: '' } as const
const IMAGE_POSITION = { left: 'sm:float-left sm:mr-6 sm:mb-4', center: 'mx-auto', right: 'sm:float-right sm:ml-6 sm:mb-4' } as const
const COLUMN_COUNT = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' } as const

const CALLOUTS = {
  info: { box: 'border-rune-blue/60 bg-rune-blue/10', title: 'text-rune-blue', Icon: Info },
  tip: { box: 'border-moss/60 bg-moss/10', title: 'text-moss', Icon: Lightbulb },
  warning: { box: 'border-gold-500/60 bg-gold-500/10', title: 'text-gold-400', Icon: TriangleAlert },
  danger: { box: 'border-rune-red/80 bg-rune-red/15', title: 'text-red-400', Icon: OctagonAlert },
  note: { box: 'border-stone-600 bg-stone-900/70', title: 'text-parchment', Icon: StickyNote },
} as const

function isExternal(href: string): boolean {
  return /^https?:/i.test(href)
}

function Block({ block }: { block: NewsBlock }) {
  switch (block.type) {
    case 'heading': {
      if (!block.text.trim()) return null
      const Tag = block.level === 3 ? 'h3' : 'h2'
      return (
        <Tag className={cn('clear-both pt-2 font-adventure uppercase tracking-wide text-gold-400', block.level === 3 ? 'text-xl' : 'text-2xl', ALIGN[block.align])}>
          <RichInline text={block.text} />
        </Tag>
      )
    }

    case 'text':
      if (!block.text.trim()) return null
      return (
        <div className={cn('space-y-4', ALIGN[block.align], TEXT_SIZE[block.size])}>
          <RichParagraphs text={block.text} />
        </div>
      )

    case 'image': {
      const src = safeImageSrc(block.src)
      if (!src) return null
      const full = block.width === 'full'
      return (
        <figure className={cn('w-full', IMAGE_WIDTH[block.width], !full && IMAGE_POSITION[block.position], full && 'clear-both')}>
          {/* eslint-disable-next-line @next/next/no-img-element -- news images are uploads served by the API */}
          <img src={src} alt={block.alt} loading="lazy" className={cn('w-full rounded-md border border-stone-700', full && 'max-h-[40rem] object-contain')} />
          {block.caption.trim() && (
            <figcaption className="mt-2 text-center text-xs text-text-muted">
              <RichInline text={block.caption} />
            </figcaption>
          )}
        </figure>
      )
    }

    case 'gallery': {
      const images = block.images.filter((image) => safeImageSrc(image.src))
      if (!images.length) return null
      return <NewsGallery images={images} columns={block.columns} />
    }

    case 'list': {
      const items = block.text.split('\n').map((item) => item.trim()).filter(Boolean)
      if (!items.length) return null
      const List = block.ordered ? 'ol' : 'ul'
      return (
        <List className={cn('space-y-2 pl-6 marker:text-gold-500', block.ordered ? 'list-decimal' : 'list-disc')}>
          {items.map((item, index) => (
            <li key={index}>
              <RichInline text={item} />
            </li>
          ))}
        </List>
      )
    }

    case 'quote':
      if (!block.text.trim()) return null
      return (
        <blockquote className="space-y-3 rounded-r-md border-l-4 border-gold-500/70 bg-stone-900/40 py-3 pl-5 pr-4 italic text-text-primary">
          <RichParagraphs text={block.text} />
          {block.cite.trim() && (
            <footer className="text-sm not-italic text-text-muted">
              &mdash; <RichInline text={block.cite} />
            </footer>
          )}
        </blockquote>
      )

    case 'callout': {
      if (!block.text.trim() && !block.title.trim()) return null
      const tone = CALLOUTS[block.tone]
      return (
        <aside className={cn('clear-both rounded-md border border-l-4 p-4', tone.box)}>
          {block.title.trim() && (
            <p className={cn('mb-2 flex items-center gap-2 font-adventure uppercase tracking-wide', tone.title)}>
              <tone.Icon className="h-4 w-4 shrink-0" aria-hidden />
              <RichInline text={block.title} />
            </p>
          )}
          <div className="space-y-3">
            <RichParagraphs text={block.text} />
          </div>
        </aside>
      )
    }

    case 'divider':
      if (block.style === 'line') return <hr className="clear-both my-8 border-stone-700" />
      return (
        <div className="clear-both my-8 flex items-center gap-3" role="separator">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-500/60" />
          <span className="text-xs text-gold-500">&#9670;</span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-500/60" />
        </div>
      )

    case 'table': {
      if (block.rows.every((row) => row.every((cell) => !cell.trim()))) return null
      const head = block.header ? block.rows[0] : null
      const body = block.header ? block.rows.slice(1) : block.rows
      return (
        <div className="clear-both overflow-x-auto rounded-md border border-stone-700">
          <table className="w-full border-collapse text-sm">
            {head && (
              <thead className="bg-stone-900">
                <tr>
                  {head.map((cell, index) => (
                    <th key={index} scope="col" className="border-b border-stone-700 px-3 py-2 text-left font-adventure font-normal uppercase tracking-wide text-gold-400">
                      <RichInline text={cell} />
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-stone-800 first:border-t-0 even:bg-stone-900/30">
                  {row.map((cell, index) => (
                    <td key={index} className="px-3 py-2 align-top">
                      <RichInline text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    case 'columns': {
      if (block.columns.every((column) => !column.text.trim() && !safeImageSrc(column.src))) return null
      return (
        <div className={cn('clear-both grid gap-6', COLUMN_COUNT[block.columns.length === 3 ? 3 : 2])}>
          {block.columns.map((column, index) => {
            const src = safeImageSrc(column.src)
            return (
              <div key={index} className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- news images are uploads served by the API */}
                {src && <img src={src} alt={column.alt} loading="lazy" className="w-full rounded-md border border-stone-700" />}
                <RichParagraphs text={column.text} />
              </div>
            )
          })}
        </div>
      )
    }

    case 'button': {
      const href = safeHref(block.href)
      if (!href || !block.label.trim()) return null
      return (
        <div className={cn('clear-both', ALIGN[block.align])}>
          <a
            href={href}
            target={isExternal(href) ? '_blank' : undefined}
            rel={isExternal(href) ? 'noreferrer' : undefined}
            className={cn(
              'inline-flex items-center justify-center rounded-md px-6 py-3 font-adventure text-sm uppercase tracking-wide transition-all duration-200',
              block.variant === 'primary'
                ? 'bg-gradient-to-b from-gold-500 to-gold-600 text-stone-950 shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(212,175,55,0.5)]'
                : 'border border-stone-700 bg-stone-800 text-gold-400 hover:border-gold-500/50 hover:bg-stone-700'
            )}
          >
            {block.label}
          </a>
        </div>
      )
    }

    case 'video': {
      const id = youtubeId(block.url)
      if (!id) return null
      return (
        <figure className="clear-both">
          <div className="aspect-video overflow-hidden rounded-md border border-stone-700 bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${id}`}
              title={block.caption.trim() || 'YouTube video'}
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
          {block.caption.trim() && (
            <figcaption className="mt-2 text-center text-xs text-text-muted">
              <RichInline text={block.caption} />
            </figcaption>
          )}
        </figure>
      )
    }
  }
}

export function NewsBlocks({ blocks }: { blocks: NewsBlock[] }) {
  return (
    <div className="flow-root [&>*:last-child]:mb-0 [&>*]:mb-5">
      {blocks.map((block) => (
        <Block key={block.id} block={block} />
      ))}
    </div>
  )
}
