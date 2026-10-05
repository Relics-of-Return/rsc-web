'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Crown } from '@/components/players/Crown'
import { menuItems } from '@/data/navigation'
import { isStaff } from '@/data/ranks'
import { useAuth } from '@/hooks/useAuth'
import { cn, formatUsername } from '@/lib/utils'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname()
  const { user, rank, loading: authLoading, logout } = useAuth()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const lastFocusedElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      lastFocusedElement.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
      closeButtonRef.current?.focus()
    } else {
      document.body.style.overflow = ''
      lastFocusedElement.current?.focus()
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements =
        closeButtonRef.current?.parentElement?.querySelectorAll<HTMLElement>(
          'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        )
      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0]!
      const lastElement = focusableElements[focusableElements.length - 1]!

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const getHref = (item: string) => (item === 'Home' ? '/' : `/${item.toLowerCase()}`)

  return (
    <div
      id="mobile-menu"
      className={cn(
        'fixed inset-0 z-50 lg:hidden transition-all duration-300',
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}
      aria-hidden={!isOpen}
    >
      <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-md" onClick={onClose} />
      <div className="relative h-full flex flex-col items-center justify-center px-6">
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-secondary hover:text-gold-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded-md"
          aria-label="Close menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <nav aria-label="Mobile">
          <ul className="flex flex-col items-center gap-6">
            {menuItems.map((item) => {
              const href = getHref(item)
              const active = pathname === href
              return (
                <li key={item}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={cn(
                      'font-adventure text-3xl uppercase tracking-wide transition-colors',
                      active ? 'text-gold-400' : 'text-text-primary hover:text-gold-400'
                    )}
                  >
                    {item}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {!authLoading && (
          <div className="mt-8 flex flex-col items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/account"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 text-lg font-medium text-gold-400 hover:text-gold-500 transition-colors"
                >
                  <Crown rank={rank} />
                  {formatUsername(user)}
                </Link>
                {isStaff(rank) && (
                  <Link
                    href="/admin"
                    onClick={onClose}
                    className="text-sm uppercase tracking-wide text-gold-500 hover:text-gold-400 transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    onClose()
                  }}
                  className="text-sm text-text-secondary hover:text-gold-400 transition-colors"
                >
                  Log Out
                </button>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  href="/login"
                  onClick={onClose}
                  className="text-lg font-medium text-text-primary hover:text-gold-400 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={onClose}
                  className="text-lg font-medium text-text-primary hover:text-gold-400 transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}

        <Link
          href="/play"
          onClick={onClose}
          className="mt-10 px-8 py-3 text-base font-medium text-stone-950 bg-gold-500 rounded-md hover:bg-gold-400 transition-colors"
        >
          Play Now
        </Link>
      </div>
    </div>
  )
}
