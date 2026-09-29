import { Skeleton } from '@/components/ui/Skeleton'
import { Container } from '@/components/ui/Container'

export default function Loading() {
  return (
    <Container className="py-16">
      <div className="mb-12">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-3 h-9 w-56" />
        <Skeleton className="mt-4 h-4 w-96 max-w-full" />
      </div>

      <div className="mx-auto max-w-3xl space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="relative rounded-lg border border-stone-700 bg-stone-800/60 p-6 pl-6">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-stone-700" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="mt-4 h-6 w-3/4" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
          </div>
        ))}
      </div>
    </Container>
  )
}
