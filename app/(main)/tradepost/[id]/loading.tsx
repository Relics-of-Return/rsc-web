import { Container } from '@/components/ui/Container'
import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <Container className="py-16">
      <Skeleton className="mb-8 h-4 w-40" />

      <div className="flex items-center gap-5">
        <Skeleton className="h-20 w-28 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-9 w-64 max-w-full" />
          <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        </div>
      </div>

      <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      <div className="mt-10 grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>

      <Skeleton className="mt-10 h-80 rounded-lg" />
    </Container>
  )
}
