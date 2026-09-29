import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// the page itself is a client component, so its metadata lives here. staff
// tools have no business in search results
export const metadata: Metadata = {
  title: 'Administration',
  description: 'Staff moderation tools.',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
