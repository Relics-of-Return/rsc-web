import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// the page itself is a client component, so its metadata lives here
export const metadata: Metadata = {
  title: 'Beta Testing',
  description:
    'Help test the next update on the beta world before it reaches everyone: the checklist of what changed, and what testers have found.',
}

export default function BetaLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
