import type { Metadata } from 'next'

import { ReleasePipeline } from '@/components/roadmap/ReleasePipeline'
import { RoadmapBoard } from '@/components/roadmap/RoadmapBoard'
import { Container } from '@/components/ui/Container'

export const metadata: Metadata = {
  title: 'Roadmap',
  description: 'What is live, in beta, in development and planned for Relics of Return.',
}

export default function RoadmapPage() {
  return (
    <Container className="py-16">
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">
          Development
        </p>
        <h1 className="mt-2 font-adventure text-3xl uppercase tracking-wide text-gold-500 sm:text-4xl">
          Roadmap
        </h1>
      </div>

      <ReleasePipeline />

      <div className="mt-12">
        <RoadmapBoard />
      </div>

      <p className="mt-12 text-center text-xs text-text-muted">
        Want to try things early? Join the beta from your{' '}
        <a href="/account" className="text-gold-400 hover:text-gold-500">
          account page
        </a>
        , and follow along on the{' '}
        <a href="/beta" className="text-gold-400 hover:text-gold-500">
          beta board
        </a>
        .
      </p>
    </Container>
  )
}
