import type { ReactNode } from 'react'

import {
  colourClass,
  colourHex,
  INLINE_SIZES,
  inlineText,
  itemId,
  parseInline,
  safeHref,
  wikiHref,
  type InlineNode,
} from '@/lib/news-format'

const SIZE_CLASS: Record<(typeof INLINE_SIZES)[number], string> = {
  small: 'text-[0.85em]',
  large: 'text-[1.25em]',
  huge: 'text-[1.6em] leading-tight',
}

function lineBreaks(text: string, key: string): ReactNode {
  const lines = text.split('\n')
  if (lines.length === 1) return text

  return lines.map((line, index) => (
    <span key={`${key}-${index}`}>
      {index > 0 && <br />}
      {line}
    </span>
  ))
}

function renderNodes(nodes: InlineNode[], key: string): ReactNode[] {
  return nodes.map((node, index) => renderNode(node, `${key}-${index}`))
}

function renderNode(node: InlineNode, key: string): ReactNode {
  if (node.kind === 'text') return <span key={key}>{lineBreaks(node.text, key)}</span>

  const children = renderNodes(node.children, key)

  switch (node.tag) {
    case 'b':
      return <strong key={key} className="font-semibold text-text-primary">{children}</strong>
    case 'i':
      return <em key={key}>{children}</em>
    case 'u':
      return <span key={key} className="underline underline-offset-2">{children}</span>
    case 's':
      return <s key={key}>{children}</s>
    case 'code':
      return <code key={key} className="rounded bg-stone-900 px-1.5 py-0.5 font-label text-[0.9em] text-gold-400">{inlineText(node.children)}</code>
    case 'color': {
      const className = colourClass(node.value, 'text')
      const hex = colourHex(node.value)
      return <span key={key} className={className ?? undefined} style={hex ? { color: hex } : undefined}>{children}</span>
    }
    case 'bg': {
      const className = colourClass(node.value, 'bg')
      const hex = colourHex(node.value)
      if (!className && !hex) return <span key={key}>{children}</span>
      return (
        <mark key={key} className={`rounded px-1 py-0.5 text-inherit [box-decoration-break:clone] ${className ?? ''}`} style={hex ? { backgroundColor: `${hex}55` } : undefined}>
          {children}
        </mark>
      )
    }
    case 'size': {
      const size = node.value.toLowerCase() as (typeof INLINE_SIZES)[number]
      return <span key={key} className={SIZE_CLASS[size] ?? undefined}>{children}</span>
    }
    case 'url': {
      const href = safeHref(node.value || inlineText(node.children))
      if (!href) return <span key={key}>{children}</span>
      const external = /^https?:/i.test(href)
      return (
        <a key={key} href={href} className="text-gold-400 underline underline-offset-2 hover:text-gold-500" target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
          {children}
        </a>
      )
    }
    case 'wiki': {
      const page = node.value || inlineText(node.children)
      if (!page.trim()) return <span key={key}>{children}</span>
      return (
        <a key={key} href={wikiHref(page)} title={`${page} on the wiki`} className="text-gold-400 underline decoration-dotted underline-offset-2 hover:text-gold-500">
          {children}
        </a>
      )
    }
    case 'item': {
      const id = itemId(node.value)
      const name = inlineText(node.children).trim()
      if (id === null) return <span key={key}>{children}</span>
      return (
        <a key={key} href={wikiHref(name || String(id))} title={name || undefined} className="inline-flex items-center gap-1 align-middle font-medium text-gold-400 hover:text-gold-500">
          {/* eslint-disable-next-line @next/next/no-img-element -- the game's item icons are static files */}
          <img src={`/items/${id}.png`} alt="" loading="lazy" className="inline-block h-[1.6em] w-auto" />
          {name && <span>{name}</span>}
        </a>
      )
    }
  }
}

export function RichInline({ text }: { text: string }) {
  return <>{renderNodes(parseInline(text), 'i')}</>
}

export function RichParagraphs({ text, className }: { text: string; className?: string }) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={className}>
          {renderNodes(parseInline(paragraph), `p${index}`)}
        </p>
      ))}
    </>
  )
}
