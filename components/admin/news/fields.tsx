'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'

import { ApiError } from '@/lib/api'
import type { Align } from '@/lib/news-format'
import { cn } from '@/lib/utils'

export const NEWS_CATEGORIES = [
  { value: 0, label: 'Website', description: 'Site, launcher, and community updates.' },
  { value: 1, label: 'Game', description: 'Content, client, and world updates.' },
  { value: 2, label: 'Technical', description: 'Infrastructure, fixes, and developer notes.' },
]

export function newsErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 403) return 'Only administrators can manage news.'
  if (error instanceof ApiError && error.status === 413) return 'This is too large to save. Split it into smaller articles, or use fewer blocks.'
  return fallback
}

export function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 413) return 'Images must be 5 MiB or smaller.'
  if (error instanceof ApiError && error.status === 400) return 'Use a PNG, JPEG, GIF or WebP image.'
  return newsErrorMessage(error, 'Unable to upload that image.')
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-text-muted">{hint}</span>}
    </div>
  )
}

export function Segmented<T extends string | number | boolean>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly { value: T; label: ReactNode; title?: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-md border border-stone-700 bg-stone-950 p-0.5">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          title={option.title}
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs transition-colors',
            option.value === value ? 'bg-gold-500/20 text-gold-400' : 'text-text-secondary hover:text-text-primary'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export const ALIGN_OPTIONS: readonly { value: Align; label: ReactNode; title: string }[] = [
  { value: 'left', label: <AlignLeft className="h-3.5 w-3.5" />, title: 'Align left' },
  { value: 'center', label: <AlignCenter className="h-3.5 w-3.5" />, title: 'Centre' },
  { value: 'right', label: <AlignRight className="h-3.5 w-3.5" />, title: 'Align right' },
]

export function SmallButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:border-gold-500/50 hover:text-gold-400 disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function IconButton({ title, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { title: string }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={cn('rounded p-1.5 text-text-muted transition-colors hover:bg-stone-800 hover:text-gold-400 disabled:pointer-events-none disabled:opacity-30', className)}
      {...props}
    >
      {children}
    </button>
  )
}
