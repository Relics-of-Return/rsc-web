"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { PlayCircle } from "lucide-react";

import { SiteLogo } from "@/components/ui/SiteLogo";
import { SITE_NAME } from "@/lib/constants";

const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

const BUTTON =
  "fx-shimmer group w-full sm:w-auto whitespace-nowrap inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-sm bg-gradient-to-b from-[#f2ca50] via-gold-500 to-[#b38e22] font-adventure text-lg font-bold uppercase tracking-wider text-[#241a00] shadow-[0_0_24px_rgba(242,202,80,0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_36px_rgba(242,202,80,0.7)] active:translate-y-0 active:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950";

function useHeroParallax() {
  const sectionRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const section = sectionRef.current;
      if (!section) return;

      const height = section.offsetHeight;
      const y = Math.min(window.scrollY, height);
      const progress = y / height;

      if (backdropRef.current)
        backdropRef.current.style.transform = `translate3d(0, ${y * 0.4}px, 0)`;
      if (contentRef.current) {
        contentRef.current.style.transform = `translate3d(0, ${y * -0.15}px, 0)`;
        contentRef.current.style.opacity = String(
          Math.max(0, 1 - progress * 1.2),
        );
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return { sectionRef, backdropRef, contentRef };
}

export function HeroSection() {
  const { sectionRef, backdropRef, contentRef } = useHeroParallax();

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[580px] items-center justify-center overflow-hidden border-b border-[#2d2419] lg:min-h-[660px]"
    >
      <div
        ref={backdropRef}
        className="absolute inset-0 will-change-transform"
        aria-hidden="true"
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full scale-105 object-cover object-center brightness-[0.45] contrast-110"
        >
          <source src="/splash/splash.mp4" type="video/mp4" />
        </video>
      </div>

      <div
        className="fx-ambient-pulse pointer-events-none absolute top-1/2 left-1/2 z-10 h-[580px] w-[580px] rounded-full bg-[radial-gradient(circle,rgba(242,202,80,0.22)_0%,rgba(212,175,55,0.09)_45%,transparent_75%)]"
        aria-hidden="true"
      />

      <div
        ref={contentRef}
        className="relative z-20 mx-auto flex max-w-5xl flex-col items-center px-4 py-20 text-center will-change-transform sm:px-6 lg:px-8 lg:py-24"
      >
        <h1 className="fx-fade-in-up mb-6 w-full" style={delay(100)}>
          <SiteLogo
            variant="hero"
            classic
            priority
            className="mx-auto drop-shadow-[0_8px_28px_rgba(0,0,0,0.95)]"
          />
          <span className="sr-only">{SITE_NAME}</span>
        </h1>

        <p
          className="fx-fade-in-up mb-6 max-w-3xl font-adventure text-3xl leading-[1.15] tracking-wide text-[#f5ebd9] drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] sm:text-4xl md:text-5xl"
          style={delay(250)}
        >
          The Golden Era of Browser MMORPGs
        </p>

        <div
          className="fx-fade-in-up flex w-full flex-col items-center justify-center gap-4 sm:flex-row"
          style={delay(550)}
        >
          <Link href="/play" className={BUTTON}>
            <PlayCircle
              className="h-[22px] w-[22px] transition-transform duration-300 group-hover:scale-110"
              aria-hidden="true"
            />
            Play in Browser
          </Link>
          <Link href="/download" className={BUTTON}>
            <PlayCircle
              className="h-[22px] w-[22px] transition-transform duration-300 group-hover:scale-110"
              aria-hidden="true"
            />
            Launcher + Client
          </Link>
        </div>
      </div>
    </section>
  );
}
