import { formatNumber } from "@/lib/utils";

interface VotesCardProps {
  votes: number | null | undefined;
}

/** How many times the account has voted for the server, account-wide. */
export function VotesCard({ votes }: VotesCardProps) {
  if (votes === null || votes === undefined) return null;

  return (
    <section className="rounded-lg border border-stone-700 bg-stone-800/60 p-5">
      <h2 className="font-adventure text-lg uppercase tracking-wide text-gold-400">
        Votes
      </h2>

      <p className="mt-4 font-adventure text-3xl text-gold-400">
        {formatNumber(votes)}
      </p>
    </section>
  );
}
