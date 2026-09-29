import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Slot } from '@radix-ui/react-slot'

import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  asChild?: boolean
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(
        'inline-flex items-center justify-center font-adventure uppercase tracking-wide transition-all duration-200 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950',
        variant === 'primary' &&
          'bg-gradient-to-b from-gold-500 to-gold-600 text-stone-950 shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] hover:-translate-y-0.5',
        variant === 'secondary' &&
          'bg-stone-800 text-gold-400 border border-stone-700 hover:border-gold-500/50 hover:bg-stone-700',
        variant === 'ghost' && 'text-text-secondary hover:text-gold-400 hover:bg-stone-800/50',
        variant === 'outline' &&
          'border-2 border-gold-500/40 text-gold-400 hover:border-gold-500 hover:bg-gold-500/10',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-5 py-2.5 text-sm',
        size === 'lg' && 'px-8 py-3.5 text-base',
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}
