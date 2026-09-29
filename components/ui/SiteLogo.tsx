'use client'

import Image from 'next/image'

import { useSiteSettings } from '@/hooks/useSiteSettings'
import { cn } from '@/lib/utils'

/**
 * Each logo at 2x and 3x. The Halloween one is its letters burning with green
 * ghost-fire, a looping GIF (branding/logo-halloween.aseprite), shown in place
 * of the usual one while an administrator has it switched on.
 */
const ART = {
  standard: { x2: '/brand/logo@2x.png', x3: '/brand/logo@3x.png' },
  halloween: { x2: '/brand/logo-halloween@2x.gif', x3: '/brand/logo-halloween@3x.gif' },
}

interface SiteLogoProps {
  /**
   * nav: 56px tall, smoothed down from the 2x export so it stays clean at a
   * size that isn't a whole multiple of the 240x100 art.
   * hero: the art scaled in whole pixels, 2x from sm and 3x from lg, and
   * smoothed to fit the screen below sm.
   */
  variant: 'nav' | 'hero'
  className?: string
  priority?: boolean
}

/**
 * The Relics of Return wordmark: the name carved on rune stones with a
 * gold-hilted sword between the rows. Drawn in Aseprite (branding/logo.aseprite).
 * Decorative here, so callers put the site name next to it for screen readers.
 */
export function SiteLogo({ variant, className, priority }: SiteLogoProps) {
  const { settings } = useSiteSettings()
  const art = settings.halloweenLogo ? ART.halloween : ART.standard

  if (variant === 'nav') {
    return (
      <span className={cn('relative block shrink-0 h-14 w-[134px]', className)}>
        <Image
          src={art.x2}
          alt=""
          fill
          unoptimized
          priority={priority}
          sizes="134px"
          className="object-contain"
        />
      </span>
    )
  }

  return (
    <span
      className={cn(
        'relative block aspect-[12/5] w-full max-w-[360px] sm:max-w-none sm:w-[480px] lg:w-[720px]',
        className
      )}
    >
      {/* each file is shown at exactly its own size where it's pixelated */}
      <Image
        src={art.x2}
        alt=""
        fill
        unoptimized
        priority={priority}
        sizes="(min-width: 640px) 480px, 360px"
        className="object-contain sm:[image-rendering:pixelated] lg:hidden"
      />
      <Image
        src={art.x3}
        alt=""
        fill
        unoptimized
        priority={priority}
        sizes="720px"
        className="hidden object-contain [image-rendering:pixelated] lg:block"
      />
    </span>
  )
}
