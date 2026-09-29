import { Skeleton } from '@/components/ui/Skeleton'
import { Container } from '@/components/ui/Container'

export default function Loading() {
  return (
    <Container className="py-16">
      <div className="mb-10 text-center">
        <Skeleton className="mx-auto h-3 w-24" />
        <Skeleton className="mx-auto mt-3 h-9 w-72" />
        <Skeleton className="mx-auto mt-4 h-4 w-96 max-w-full" />
      </div>

      {/* Tab row */}
      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-md" />
        ))}
      </div>

      {/* Table */}
      <div className="mt-10 rounded-lg border border-stone-700">
        <div className="border-b border-stone-700 bg-stone-800/80 px-4 py-3">
          <div className="flex gap-6">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-14" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-stone-800 px-4 py-2.5 last:border-0">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="ml-auto h-4 w-10" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </Container>
  )
}
