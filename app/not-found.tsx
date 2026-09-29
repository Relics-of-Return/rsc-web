import Link from 'next/link'

import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-adventure text-6xl text-gold-500 uppercase">404</h1>
      <p className="mt-4 text-lg text-text-secondary">
        This page has wandered off into the Wilderness.
      </p>
      <div className="mt-8">
        <Button asChild>
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    </div>
  )
}
