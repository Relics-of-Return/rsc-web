'use client'

import Image from 'next/image'

import { useSiteSettings } from '@/hooks/useSiteSettings'
import { cn } from '@/lib/utils'

const ART = {
  standard: { x2: '/brand/logo@2x.png', x3: '/brand/logo@3x.png', aspect: 'aspect-[12/5]' },
  classic: {
    x2: '/brand/logo-classic@2x.png',
    x3: '/brand/logo-classic.png',
    aspect: 'aspect-[24/13]',
  },
  halloween: {
    x2: '/brand/logo-halloween@2x.gif',
    x3: '/brand/logo-halloween@3x.gif',
    aspect: 'aspect-[12/5]',
  },
}

interface SiteLogoProps {
  variant: 'nav' | 'hero'
  classic?: boolean
  className?: string
  priority?: boolean
}

export function SiteLogo({ variant, classic, className, priority }: SiteLogoProps) {
  const { settings } = useSiteSettings()
  const chosen = classic ? ART.classic : ART.standard
  const art = settings.halloweenLogo ? ART.halloween : chosen

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
        'relative block w-full max-w-[360px] sm:max-w-none sm:w-[480px] lg:w-[720px]',
        art.aspect,
        className
      )}
    >
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
