import localFont from 'next/font/local'
import { Source_Sans_3, Space_Mono } from 'next/font/google'

import { cn } from '@/lib/utils'

export const alagard = localFont({
  src: '../app/fonts/alagard.ttf',
  display: 'swap',
  variable: '--font-alagard',
})

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-sans',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-space-mono',
})

export const landingFontVariables = cn(sourceSans.variable, spaceMono.variable)
