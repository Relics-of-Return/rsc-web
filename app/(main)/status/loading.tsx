import { Skeleton } from '@/components/ui/Skeleton'
import { Container } from '@/components/ui/Container'

export default function Loading() {
  return (
    <Container className="py-16">
      <div className="mb-10 text-center">
        <Skeleton className="mx-auto h-3 w-12" />
        <Skeleton className="mx-auto mt-3 h-9 w-52" />
        <Skeleton className="mx-auto mt-4 h-4 w-96 max-w-full" />
      </div>

      <div className="mx-auto max-w-4xl rounded-lg border border-stone-700">
        <div className="border-b border-stone-700 bg-stone-800/80 px-4 py-3">
          <div className="flex gap-8">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-8 border-b border-stone-800 px-4 py-3 last:border-0">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="ml-auto h-4 w-10" />
          </div>
        ))}
      </div>
    </Container>
  )
}
