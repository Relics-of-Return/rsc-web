import type { PlayerCollectionLog } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface CollectionLogCardProps {
  collection: PlayerCollectionLog | null | undefined;
}

export function CollectionLogCard({ collection }: CollectionLogCardProps) {
  if (!collection) return null;

  const found = Number(collection.collections ?? 0);
  const total = Number(collection.total ?? 0);
  const completions = Number(collection.completions ?? 0);
  const percent =
    total > 0 ? Math.min(100, Math.round((found / total) * 100)) : 0;

  return (
    <section className="rounded-lg border border-stone-700 bg-stone-800/60 p-5">
      <h2 className="font-adventure text-lg uppercase tracking-wide text-gold-400">
        Collection Log
      </h2>

      <p className="mt-4 font-adventure text-3xl text-gold-400">
        {formatNumber(found)}
        <span className="text-text-muted"> / {formatNumber(total)}</span>
      </p>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-stone-900"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Collection log found"
      >
        <div
          className="h-full rounded-full bg-gold-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-3 text-sm text-text-secondary">
        <span className="text-text-primary">{formatNumber(completions)}</span>{" "}
        {completions === 1 ? "source" : "sources"} completed
      </p>
    </section>
  );
}
