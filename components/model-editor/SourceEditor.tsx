'use client'

import { useMemo, useRef } from 'react'

import { cn } from '@/lib/utils'

/**
 * The model's source: a plain editor with line numbers, four-space tabs and
 * Ctrl+S to save. The view redraws as you type. The line an error came from
 * is marked in the gutter.
 */

const INDENT = '    '

interface SourceEditorProps {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  errorLine?: number | null
  readOnly?: boolean
  className?: string
}

export function SourceEditor({ value, onChange, onSave, errorLine, readOnly, className }: SourceEditorProps) {
  const area = useRef<HTMLTextAreaElement>(null)
  const gutter = useRef<HTMLDivElement>(null)

  const lines = useMemo(() => value.split('\n').length, [value])

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      onSave()
      return
    }

    if (event.key !== 'Tab' || readOnly) {
      return
    }

    // a tab indents, shift-tab takes one away, on every line selected
    event.preventDefault()

    const element = event.currentTarget
    const { selectionStart: start, selectionEnd: end } = element
    const lineStart = value.lastIndexOf('\n', start - 1) + 1

    if (start === end && !event.shiftKey) {
      const next = value.slice(0, start) + INDENT + value.slice(end)

      onChange(next)
      requestAnimationFrame(() => element.setSelectionRange(start + INDENT.length, start + INDENT.length))
      return
    }

    const block = value.slice(lineStart, end)
    const changed = event.shiftKey
      ? block.replace(/^( {1,4})/gm, '')
      : block.replace(/^/gm, INDENT)
    const next = value.slice(0, lineStart) + changed + value.slice(end)

    onChange(next)
    requestAnimationFrame(() => element.setSelectionRange(lineStart, lineStart + changed.length))
  }

  return (
    <div
      className={cn(
        'relative flex min-h-0 overflow-hidden rounded-lg border border-stone-700 bg-stone-950 font-mono text-[12px] leading-[18px]',
        className,
      )}
    >
      <div
        ref={gutter}
        aria-hidden
        className="w-12 shrink-0 select-none overflow-hidden border-r border-stone-800 bg-stone-900/60 py-2 pr-2 text-right text-text-muted"
      >
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(errorLine === i + 1 && 'bg-red-900/60 text-red-200')}
          >
            {i + 1}
          </div>
        ))}
      </div>

      <textarea
        ref={area}
        value={value}
        readOnly={readOnly}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        wrap="off"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onScroll={(event) => {
          if (gutter.current) {
            gutter.current.scrollTop = event.currentTarget.scrollTop
          }
        }}
        className="min-h-0 flex-1 resize-none bg-transparent px-3 py-2 text-stone-200 outline-none [tab-size:4]"
      />
    </div>
  )
}
