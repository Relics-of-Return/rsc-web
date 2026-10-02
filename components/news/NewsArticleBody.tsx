import type { ReactNode } from 'react'

function inline(text: string): ReactNode[] {
  const parts = text.split(/(!\[[^\]]*\]\([^\)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^\)]+\))/g)

  return parts.map((part, index) => {
    const image = part.match(/^!\[([^\]]*)\]\(([^\)]+)\)$/)
    if (image && /^\/(?!\/)/.test(image[2])) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- news images are uploaded to the same API.
        <img key={index} src={image[2]} alt={image[1]} className="my-5 max-h-[32rem] w-full rounded-md border border-stone-700 object-contain" />
      )
    }

    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="rounded bg-stone-900 px-1.5 py-0.5 text-gold-300">{part.slice(1, -1)}</code>

    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\)]+|\/[^\)]*)\)$/)
    if (link) return <a key={index} href={link[2]} className="text-gold-400 underline" target={link[2].startsWith('http') ? '_blank' : undefined} rel={link[2].startsWith('http') ? 'noreferrer' : undefined}>{link[1]}</a>

    return <span key={index}>{part}</span>
  })
}

function block(block: string, index: number): ReactNode {
  const lines = block.split('\n')
  const first = lines[0]

  if (first.startsWith('### ')) return <h3 key={index} className="font-adventure text-xl uppercase tracking-wide text-gold-400">{inline(first.slice(4))}</h3>
  if (first.startsWith('## ')) return <h2 key={index} className="font-adventure text-2xl uppercase tracking-wide text-gold-400">{inline(first.slice(3))}</h2>
  if (first.startsWith('> ')) return <blockquote key={index} className="border-l-2 border-gold-500/70 pl-4 italic text-text-primary">{inline(first.slice(2))}</blockquote>

  if (lines.every((line) => /^[-*] /.test(line))) {
    return <ul key={index} className="list-disc space-y-2 pl-6">{lines.map((line, lineIndex) => <li key={lineIndex}>{inline(line.slice(2))}</li>)}</ul>
  }

  if (lines.every((line) => /^\d+\. /.test(line))) {
    return <ol key={index} className="list-decimal space-y-2 pl-6">{lines.map((line, lineIndex) => <li key={lineIndex}>{inline(line.replace(/^\d+\. /, ''))}</li>)}</ol>
  }

  return <p key={index}>{inline(block.replaceAll('\n', ' '))}</p>
}

export function NewsArticleBody({ body }: { body: string }) {
  return <div className="space-y-5">{body.split(/\n{2,}/).filter(Boolean).map(block)}</div>
}
