import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { SITE_URL } from '@/lib/config'
import {
  DISCORD_URL,
  GITHUB_URL,
  SITE_NAME,
  SITE_TAGLINE,
} from '@/lib/constants'
import { alagard } from '@/lib/fonts'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - ${SITE_TAGLINE}`,
    template: `%s - ${SITE_NAME}`,
  },
  description: SITE_TAGLINE,
  keywords: [
    'RuneScape Classic',
    'private server',
    'Relics of Return',
    'RSC',
    'hiscores',
    'browser game',
    'open source',
  ],
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_TAGLINE,
    url: SITE_URL,
  },
  twitter: {
    card: 'summary',
    title: SITE_NAME,
    description: SITE_TAGLINE,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: '#14110d',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_TAGLINE,
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
        sameAs: [GITHUB_URL, DISCORD_URL],
      },
    },
    {
      '@type': 'VideoGame',
      '@id': `${SITE_URL}/#game`,
      name: SITE_NAME,
      description: SITE_TAGLINE,
      genre: ['MMORPG', 'Retro RPG', 'RuneScape Classic'],
      gamePlatform: ['Web Browser', 'Windows', 'macOS', 'Linux'],
      applicationCategory: 'Game',
      operatingSystem: 'Any',
      playMode: 'MultiPlayer',
      url: `${SITE_URL}/play`,
      sameAs: [GITHUB_URL, DISCORD_URL],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${alagard.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-stone-950 text-text-primary font-body"
        suppressHydrationWarning
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
