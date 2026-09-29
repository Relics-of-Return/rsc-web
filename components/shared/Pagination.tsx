import Link from 'next/link'

import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  buildHref: (page: number) => string
  className?: string
}

export function Pagination({ page, totalPages, buildHref, className }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav
      className={cn('mt-8 flex items-center justify-center gap-4 text-sm', className)}
      aria-label="Pagination"
    >
      {page > 0 ? (
        <Link
          href={buildHref(page - 1)}
          className="px-4 py-2 rounded-md border border-stone-700 text-text-secondary hover:border-gold-500/50 hover:text-gold-400 transition-colors"
        >
          &laquo; Previous
        </Link>
      ) : (
        <span className="px-4 py-2 rounded-md border border-stone-800 text-stone-700">&laquo; Previous</span>
      )}

      <span className="text-text-muted">
        Page <span className="text-gold-400">{page + 1}</span> of{' '}
        <span className="text-gold-400">{totalPages}</span>
      </span>

      {page + 1 < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          className="px-4 py-2 rounded-md border border-stone-700 text-text-secondary hover:border-gold-500/50 hover:text-gold-400 transition-colors"
        >
          Next &raquo;
        </Link>
      ) : (
        <span className="px-4 py-2 rounded-md border border-stone-800 text-stone-700">Next &raquo;</span>
      )}
    </nav>
  )
}
