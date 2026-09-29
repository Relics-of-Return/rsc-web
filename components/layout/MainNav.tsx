'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { MobileMenu } from '@/components/layout/MobileMenu'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { SiteLogo } from '@/components/ui/SiteLogo'
import { menuItems } from '@/data/navigation'
import { SITE_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function MainNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (item: string) => {
    if (item === 'Home') return pathname === '/'

    // startsWith so a sub-page keeps its section highlighted, e.g. the
    // world 2 map at /map/world-2
    return pathname.startsWith(`/${item.toLowerCase()}`)
  }

  const getHref = (item: string) => {
    if (item === 'Home') return '/'
    return `/${item.toLowerCase()}`
  }

  return (
    <header className="sticky top-0 z-40 bg-stone-900/90 backdrop-blur-md border-b border-stone-800">
      <Container>
        <nav className="flex items-center justify-between h-16" aria-label="Primary">
          <Link
            href="/"
            className="flex items-center rounded-md transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50"
          >
            <SiteLogo variant="nav" priority />
            <span className="sr-only">{SITE_NAME}</span>
          </Link>

          <ul className="hidden lg:flex items-center gap-1">
            {menuItems.map((item) => {
              const href = getHref(item)
              const active = isActive(item)
              return (
                <li key={item}>
                  <Link
                    href={href}
                    className={cn(
                      'relative px-4 py-2 text-sm font-medium uppercase tracking-wide transition-colors',
                      active ? 'text-gold-400' : 'text-text-secondary hover:text-gold-400'
                    )}
                  >
                    {item}
                    {active && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gold-500 rounded-full" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="hidden lg:flex items-center gap-3">
            <Button asChild size="md">
              <Link href="/play">Play Now</Link>
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 text-text-secondary hover:text-gold-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded-md"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </nav>
      </Container>

      <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  )
}
