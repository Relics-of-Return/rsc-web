import { Globe, Sword, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const NEWS_CATEGORIES: Record<number, string> = {
  0: 'Website',
  1: 'Game',
  2: 'Technical',
}

export function newsCategoryLabel(category: number): string {
  return NEWS_CATEGORIES[category] ?? 'News'
}

export interface NewsCategoryStyle {
  label: string
  Icon: LucideIcon
  textColor: string
  borderColor: string
  bgColor: string
  accentColor: string
}

export const NEWS_CATEGORY_STYLES: Record<number, NewsCategoryStyle> = {
  0: {
    label: 'Website',
    Icon: Globe,
    textColor: 'text-rune-blue',
    borderColor: 'border-rune-blue/40',
    bgColor: 'bg-rune-blue/10',
    accentColor: 'bg-rune-blue',
  },
  1: {
    label: 'Game',
    Icon: Sword,
    textColor: 'text-moss',
    borderColor: 'border-moss/40',
    bgColor: 'bg-moss/10',
    accentColor: 'bg-moss',
  },
  2: {
    label: 'Technical',
    Icon: Wrench,
    textColor: 'text-ember',
    borderColor: 'border-ember/40',
    bgColor: 'bg-ember/10',
    accentColor: 'bg-ember',
  },
}

export function newsCategoryStyle(category: number): NewsCategoryStyle {
  return (
    NEWS_CATEGORY_STYLES[category] ?? {
      label: 'News',
      Icon: Globe,
      textColor: 'text-gold-400',
      borderColor: 'border-gold-500/40',
      bgColor: 'bg-gold-500/10',
      accentColor: 'bg-gold-500',
    }
  )
}
