import type { ReactNode } from 'react'

interface SectionTitleProps {
  eyebrow?: string
  /** Usually a string, but may carry inline marks such as a staff crown. */
  title: ReactNode
  description?: string
  align?: 'left' | 'center'
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  align = 'center',
}: SectionTitleProps) {
  return (
    <div className={align === 'center' ? 'text-center' : 'text-left'}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 font-adventure text-3xl sm:text-4xl text-gold-500 uppercase tracking-wide">
        {title}
      </h2>
      {description && (
        <p
          className={
            align === 'center'
              ? 'mt-4 max-w-2xl mx-auto text-text-secondary'
              : 'mt-4 text-text-secondary'
          }
        >
          {description}
        </p>
      )}
    </div>
  )
}
