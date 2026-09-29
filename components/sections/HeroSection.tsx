'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { SiteLogo } from '@/components/ui/SiteLogo'
import { SITE_NAME } from '@/lib/constants'

export function HeroSection() {
  return (
    <section className="relative min-h-[560px] flex items-center justify-center overflow-hidden">
      {/* Dark gradient backdrop (key art background can replace this later) */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950"
        aria-hidden="true"
      />
      {/* Subtle gold glow */}
      <div
        className="absolute left-1/2 top-1/3 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-gold-500/10 blur-3xl"
        aria-hidden="true"
      />

      <Container className="relative z-10 text-center pt-12 pb-16">
        <h1>
          <SiteLogo
            variant="hero"
            priority
            className="mx-auto drop-shadow-[0_6px_24px_rgba(0,0,0,0.7)]"
          />
          <span className="sr-only">{SITE_NAME}</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl md:text-2xl text-text-primary max-w-2xl mx-auto drop-shadow-md">
          Relive RuneScape Classic on an open-source private server. Play in your browser, climb
          the hiscores, and rediscover 2003.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="min-w-[180px]">
            <Link href="/play">Play Now</Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="min-w-[180px]">
            <Link href="/hiscores">View Hiscores</Link>
          </Button>
        </div>
      </Container>
    </section>
  )
}
