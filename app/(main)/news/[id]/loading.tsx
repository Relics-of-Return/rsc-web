import { Skeleton } from '@/components/ui/Skeleton'
import { Container } from '@/components/ui/Container'

export default function Loading() {
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2 mb-8">
          <Skeleton className="h-4 w-12" />
          <span className="text-text-muted">/</span>
          <Skeleton className="h-4 w-28" />
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-9 w-3/4 mb-4" />
          <Skeleton className="h-1.5 w-24 rounded-full" />

          <div className="mt-6 rounded-lg border border-stone-700 bg-stone-800/60 p-8 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      </div>
    </Container>
  )
}
