'use client'

import type { CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { PlayCircle, Trophy } from 'lucide-react'

import { SiteLogo } from '@/components/ui/SiteLogo'
import { SITE_NAME } from '@/lib/constants'


const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` })

export function HeroSection() {
  return (
    <section className="relative min-h-[580px] lg:min-h-[660px] flex items-center justify-center overflow-hidden border-b border-[#2d2419]">
      {/* Castle backdrop under layered vignettes and two flickering torch glows */}
      <div className="absolute inset-0" aria-hidden="true">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover object-center brightness-[0.45] contrast-110 scale-105"
        >
          <source src="/splash/splash.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      </div>

      <div
        className="fx-ambient-pulse absolute top-1/2 left-1/2 z-10 w-[580px] h-[580px] rounded-full bg-[radial-gradient(circle,rgba(242,202,80,0.22)_0%,rgba(212,175,55,0.09)_45%,transparent_75%)] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24 text-center flex flex-col items-center">
        <h1 className="fx-fade-in-up mb-6 w-full" style={delay(100)}>
          <SiteLogo
            variant="hero"
            priority
            className="mx-auto drop-shadow-[0_8px_28px_rgba(0,0,0,0.95)]"
          />
          <span className="sr-only">{SITE_NAME}</span>
        </h1>

        <p
          className="fx-fade-in-up font-adventure text-3xl sm:text-4xl md:text-5xl text-[#f5ebd9] tracking-wide mb-6 max-w-3xl leading-[1.15] drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]"
          style={delay(250)}
        >
          The Golden Era of Browser MMORPGs
        </p>

        <div
          className="fx-fade-in-up flex flex-col sm:flex-row items-center justify-center gap-4 w-full"
          style={delay(550)}
        >
          <Link
            href="/play"
            className="fx-shimmer group w-full sm:w-auto whitespace-nowrap inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-sm bg-gradient-to-b from-[#f2ca50] via-gold-500 to-[#b38e22] font-adventure text-lg font-bold uppercase tracking-wider text-[#241a00] shadow-[0_0_24px_rgba(242,202,80,0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_36px_rgba(242,202,80,0.7)] active:translate-y-0 active:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950"
          >
            <PlayCircle
              className="w-[22px] h-[22px] transition-transform duration-300 group-hover:scale-110"
              aria-hidden="true"
            />
            Play in Browser
          </Link>
                    <Link
            href="/download"
            className="fx-shimmer group w-full sm:w-auto whitespace-nowrap inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-sm bg-gradient-to-b from-[#f2ca50] via-gold-500 to-[#b38e22] font-adventure text-lg font-bold uppercase tracking-wider text-[#241a00] shadow-[0_0_24px_rgba(242,202,80,0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_36px_rgba(242,202,80,0.7)] active:translate-y-0 active:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950"
          >
            <PlayCircle
              className="w-[22px] h-[22px] transition-transform duration-300 group-hover:scale-110"
              aria-hidden="true"
            />
            Launcher + Client
          </Link>
        </div>
      </div>
    </section>
  )
}
