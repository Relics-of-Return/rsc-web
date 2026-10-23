import Image from "next/image";
import { ArrowUpRight, ExternalLink, Gift, Trophy, Vote } from "lucide-react";

import { Reveal } from "@/components/ui/Reveal";
import { SERVER_LIST_URL, SERVER_LIST_VOTE_URL } from "@/lib/constants";

const VOTE_BUTTON =
  "fx-shimmer group relative inline-flex w-full items-center justify-center gap-2.5 rounded-sm border border-[#ffe9a8]/60 bg-gradient-to-b from-[#ffe088] via-[#f2ca50] to-[#b38e22] px-6 py-3.5 font-adventure text-base font-bold uppercase tracking-wider text-[#241a00] shadow-[0_0_22px_rgba(242,202,80,0.35),inset_0_1px_0_rgba(255,255,255,0.5)] transition-[transform,box-shadow,filter] duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-[0_0_34px_rgba(242,202,80,0.6),inset_0_1px_0_rgba(255,255,255,0.5)] active:translate-y-0 active:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0906]";

const PERKS = [
  {
    Icon: Vote,
    title: "One ballot, one vote",
    copy: "Every voter counts once toward the week\u2019s race.",
  },
  {
    Icon: Trophy,
    title: "Weekly voter race",
    copy: "The server with the most unique voters takes it.",
  },
  {
    Icon: Gift,
    title: "In-game rewards for voters",
    copy: "Vote for Relics of Return in the RSC Server List and earn rewards.",
  },
];

export function VoteSection() {
  return (
    <section
      id="vote"
      aria-labelledby="vote-heading"
      className="relative scroll-mt-20 overflow-hidden border-b border-[#292015] bg-[#14110d] py-16 lg:py-20"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mb-10 flex flex-col justify-between gap-3 border-b border-[#2b2216] pb-4 sm:flex-row sm:items-end">
            <div className="flex items-center gap-3">
              <Vote className="h-6 w-6 text-[#f2ca50]" aria-hidden="true" />
              <h2
                id="vote-heading"
                className="font-adventure text-3xl font-bold tracking-wide text-[#f5ebd9] sm:text-4xl"
              >
                Vote for us
              </h2>
            </div>

            <a
              href={SERVER_LIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group/link inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-[0.18em] text-[#d0c5af] transition-colors hover:text-[#f2ca50] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f2ca50]/60"
            >
              View leaderboard
              <ArrowUpRight
                className="h-4 w-4 transition-transform duration-300 motion-safe:group-hover/link:-translate-y-0.5 motion-safe:group-hover/link:translate-x-0.5"
                aria-hidden="true"
              />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="relative overflow-hidden rounded-sm border-[3px] border-[#3d3121] bg-gradient-to-br from-[#1e1710] via-[#17120c] to-[#120e09] shadow-[inset_0_0_0_1px_#1a140d,0_0_0_1px_#5c4b32,0_6px_16px_rgba(0,0,0,0.7)]">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="relative flex flex-col justify-center gap-8 p-6 sm:p-8 lg:col-span-7 lg:p-10">
                <div>
                  <Image
                    src="/brand/mini_logo-icon.png"
                    alt=""
                    width={64}
                    height={64}
                    unoptimized
                    className="mb-5 block h-16 w-16 [image-rendering:pixelated]"
                  />

                  <p className="relative flex items-center gap-3 font-label text-[11px] uppercase tracking-[0.26em] text-[#f2ca50]">
                    <span
                      className="h-px w-7 bg-gradient-to-r from-transparent to-[#f2ca50]/70"
                      aria-hidden="true"
                    />
                    Support the realm
                  </p>

                  <h3 className="relative mt-3 max-w-md text-balance font-adventure text-2xl leading-tight text-[#f5ebd9] sm:text-3xl">
                    Keep the realm on the map.
                  </h3>

                  <p className="relative mt-4 max-w-xl text-sm leading-relaxed text-[#d0c5af] sm:text-base">
                    Every week the RSC Server List crowns the server with the
                    most unique voters. Cast a ballot for Relics of Return, help
                    the Realm take the week, and fly its banner a little higher.
                  </p>
                </div>

                <ul className="relative grid gap-4 border-t border-[#2b2216] pt-5 sm:grid-cols-3 sm:gap-5">
                  {PERKS.map(({ Icon, title, copy }) => (
                    <li key={title} className="flex gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-[#f2ca50]/25 bg-[#f2ca50]/[0.05]">
                        <Icon
                          className="h-4 w-4 text-[#f2ca50]"
                          aria-hidden="true"
                        />
                      </span>
                      <div>
                        <p className="font-adventure text-sm font-bold leading-snug text-[#f5ebd9]">
                          {title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[#a89f8f]">
                          {copy}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative flex flex-col items-center justify-between gap-5 overflow-hidden border-t border-[#3a2d1d] bg-[#0c0906] p-6 sm:p-8 lg:col-span-5 lg:border-t-0 lg:border-l lg:p-10">
                <div className="relative w-full max-w-[16rem] sm:max-w-[21rem]">
                  <Image
                    src="/vote/vote_icon.png"
                    alt=""
                    width={640}
                    height={420}
                    unoptimized
                    className="h-auto w-full"
                  />
                </div>

                <div className="relative text-center">
                  <p className="font-adventure text-lg text-[#f5ebd9] sm:text-xl">
                    Every unique voter counts
                  </p>
                  <p className="mt-1.5 font-label text-[10px] uppercase tracking-[0.2em] text-[#857968]">
                    Week resets Monday
                  </p>
                </div>

                <div className="relative w-full max-w-xs">
                  <a
                    href={SERVER_LIST_VOTE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={VOTE_BUTTON}
                  >
                    <Vote
                      className="h-5 w-5 transition-transform duration-300 motion-safe:group-hover:-rotate-6"
                      aria-hidden="true"
                    />
                    Cast your vote
                    <ExternalLink
                      className="h-4 w-4 opacity-70"
                      aria-hidden="true"
                    />
                    <span className="sr-only">
                      {" "}
                      on the RSC Server List (opens in a new tab)
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
