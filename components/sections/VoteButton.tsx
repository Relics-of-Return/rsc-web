"use client";

import { ExternalLink, Vote } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { SERVER_LIST_VOTE_URL } from "@/lib/constants";

/** The vote link, with the toplist's in-game username box filled in for a logged-in player. */
export function VoteButton({ className }: { className: string }) {
  const { user } = useAuth();
  const href = user
    ? `${SERVER_LIST_VOTE_URL}?username=${encodeURIComponent(user)}`
    : SERVER_LIST_VOTE_URL;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <Vote
        className="h-5 w-5 transition-transform duration-300 motion-safe:group-hover:-rotate-6"
        aria-hidden="true"
      />
      Cast your vote
      <ExternalLink className="h-4 w-4 opacity-70" aria-hidden="true" />
      <span className="sr-only">
        {" "}
        on the RSC Server List (opens in a new tab)
      </span>
    </a>
  );
}
