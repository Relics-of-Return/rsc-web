import type { InputHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={cn(
        'w-full rounded-md border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-gold-500/60 focus:outline-none focus:ring-2 focus:ring-gold-500/20',
        className
      )}
      {...props}
    />
  )
}
