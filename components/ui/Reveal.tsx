"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type Phase = "static" | "waiting" | "shown";

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("static");

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const belowFold =
      element.getBoundingClientRect().top > window.innerHeight * 0.85;
    if (reduced || !belowFold) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setPhase("shown");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -15% 0px" },
    );

    requestAnimationFrame(() =>
      setPhase((current) => (current === "static" ? "waiting" : current)),
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        phase !== "static" &&
          "transition-[opacity,transform] duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        phase === "waiting" && "translate-y-12 opacity-0",
        className,
      )}
      style={phase === "shown" ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
