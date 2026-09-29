import { Container } from '@/components/ui/Container'
import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <Container className="py-16">
      <div className="mb-10 text-center">
        <Skeleton className="mx-auto h-3 w-28" />
        <Skeleton className="mx-auto mt-3 h-9 w-56" />
        <Skeleton className="mx-auto mt-4 h-4 w-96 max-w-full" />
      </div>

      <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      <Skeleton className="mt-10 h-9 w-full sm:max-w-xs rounded-md" />

      <div className="mt-4 rounded-lg border border-stone-700">
        <div className="border-b border-stone-700 bg-stone-800/80 px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-stone-800 px-4 py-3 last:border-0">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </Container>
  )
}
