import type { Metadata } from "next";

import { BetaChecklist } from "@/components/beta/BetaChecklist";
import { Container } from "@/components/ui/Container";
import { betaRevision } from "@/data/beta-tests";

const REPORT_URL =
  "https://discord.com/channels/1551412750821888050/1564737814858301561";

export const metadata: Metadata = {
  title: "Beta Testing",
  description:
    "What beta testers try on World 3 before the next Relics of Return update reaches Worlds 1 and 2.",
};

export default function BetaPage() {
  return (
    <Container className="py-16">
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">
          World 3
        </p>
        <h1 className="mt-2 font-adventure text-3xl uppercase tracking-wide text-gold-500 sm:text-4xl">
          Beta Testing
        </h1>
        <p className="mt-3 text-sm text-text-muted">
          Current beta build{" "}
          <code className="rounded bg-stone-800 px-1.5 py-0.5 font-mono text-gold-400">
            {betaRevision}
          </code>
        </p>
      </div>

      <BetaChecklist>
        <div className="mx-auto mb-10 grid max-w-4xl gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-4 text-sm text-text-primary">
            <p className="font-semibold text-gold-500">Try it everywhere</p>
            <p className="mt-1 text-text-muted">
              Classic and HD graphics, Fixed, Resizable and Classic layouts,
              browser, launcher and on mobile.
            </p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-4 text-sm text-text-primary">
            <p className="flex items-center gap-1.5 font-semibold text-gold-500">
              <span className="inline-flex h-[1.25em] w-[1.25em] items-center justify-center rounded border border-gold-600/60 text-[0.75em] leading-none">
                ★
              </span>
              Try it twice
            </p>
            <p className="mt-1 text-text-muted">
              Anything with items, coins or saved progress: do it, log out, log
              back in and check it again.
            </p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-4 text-sm text-text-primary">
            <p className="font-semibold text-gold-500">Report it</p>
            <p className="mt-1 text-text-muted">
              Post what you find in the{" "}
              <a
                href={REPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-400 hover:text-gold-500"
              >
                beta channel on Discord
              </a>
              : world, layout, graphics, device and a screenshot.
            </p>
          </div>
        </div>
      </BetaChecklist>
    </Container>
  );
}
