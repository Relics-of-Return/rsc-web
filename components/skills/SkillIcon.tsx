import Image from 'next/image'

import { skillIconPath } from '@/data/skills'
import { cn } from '@/lib/utils'

interface SkillIconProps {
  /** Skill identifier, e.g. `attack`, `ranged`, `overall`. */
  skill: string
  className?: string
}

export function SkillIcon({ skill, className }: SkillIconProps) {
  const src = skillIconPath(skill)
  if (!src) return null

  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center shrink-0',
        'w-5 h-5',
        className,
      )}
      aria-hidden="true"
    >
      <Image
        src={src}
        alt=""
        fill
        className="object-contain"
        sizes="1.25rem"
      />
    </span>
  )
}
