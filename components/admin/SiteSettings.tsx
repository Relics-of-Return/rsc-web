'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

import { useSiteSettings } from '@/hooks/useSiteSettings'
import { ApiError, getSiteConfig, saveSiteSettings } from '@/lib/api'
import type { LoginTheme, SiteSettings as Settings } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * The game client's login scenes (rsc-client's src/title-screen.js), each with
 * its painted backdrop as the client's own server has it.
 */
const THEMES: { id: LoginTheme; label: string; description: string; image?: string }[] = [
  {
    id: 'seasonal',
    label: 'By season',
    description:
      'Halloween from 1 October to 2 November, Christmas from 1 December to 6 January, Easter for a week either side of Easter Sunday, and the Stone Hall otherwise.',
  },
  {
    id: 'default',
    label: 'Stone Hall',
    description: 'A torchlit stone gateway.',
    image: 'login-default.png',
  },
  {
    id: 'halloween',
    label: 'Halloween',
    description: 'The gate of Hades in a graveyard, with the burning logo.',
    image: 'login-halloween.png',
  },
  {
    id: 'christmas',
    label: 'Christmas',
    description: 'The gateway under snow and lights.',
    image: 'login-christmas.png',
  },
  {
    id: 'easter',
    label: 'Easter',
    description: 'The gateway in spring, with bunnies and blossom.',
    image: 'login-easter.png',
  },
]

const SCENES = THEMES.filter((theme) => theme.image)

/** A scene's backdrop, or nothing when the client's server can't show it. */
function Backdrop({ src, className }: { src: string | null; className?: string }) {
  const [broken, setBroken] = useState(false)

  if (!src || broken) {
    return <span className={cn('block bg-stone-950', className)} />
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- served by the game client, not this site
    <img
      src={src}
      alt=""
      onError={() => setBroken(true)}
      className={cn('block bg-stone-950 object-cover', className)}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

/**
 * Settings that change the site and the game for everybody. They're kept by
 * rsc-www, which only takes changes from administrators, and show on the next
 * page anyone loads (and at once here, for whoever changed them).
 */
export function SiteSettings() {
  const { settings, setSettings } = useSiteSettings()
  const [saving, setSaving] = useState<keyof Settings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clientURL, setClientURL] = useState<string | null>(null)

  // the backdrops come from the game client's server, which the site's
  // config points at
  useEffect(() => {
    getSiteConfig()
      .then((config) => setClientURL(config.clientURL))
      .catch(() => setClientURL(null))
  }, [])

  const backdrop = (image?: string) => {
    if (!image || !clientURL) return null

    try {
      return new URL(`title/${image}`, clientURL).href
    } catch {
      return null
    }
  }

  const change = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSaving(key)
    setError(null)

    try {
      setSettings(await saveSiteSettings({ [key]: value }))
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? 'Your session has ended. Log in again to change settings.'
          : e instanceof ApiError && e.status === 403
            ? 'Only administrators can change the site settings.'
            : 'Unable to save that setting. The website API may be offline.',
      )
    } finally {
      setSaving(null)
    }
  }

  return (
    <section className="rounded-lg border border-stone-700 bg-stone-800/60">
      <header className="border-b border-stone-700 px-5 py-4">
        <h2 className="font-adventure text-lg uppercase tracking-wide text-gold-400">
          Site Settings
        </h2>
        <p className="mt-1 text-xs text-text-secondary">
          Changes everybody sees, from the next page they load. Administrators only.
        </p>
      </header>

      {error && (
        <p className="border-b border-stone-700 bg-rune-red/10 px-5 py-3 text-sm text-parchment">
          {error}
        </p>
      )}

      <fieldset className="border-b border-stone-700 px-5 py-5" disabled={saving !== null}>
        <legend className="sr-only">Login theme</legend>
        <p className="text-sm font-medium text-text-primary" aria-hidden="true">
          Login theme
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          The scene behind the game client&apos;s login screen. Every player sees this one; there
          is no longer a way to change it in the game.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {THEMES.map((theme) => {
            const chosen = settings.loginTheme === theme.id

            return (
              <label
                key={theme.id}
                className={cn(
                  'flex cursor-pointer flex-col overflow-hidden rounded-md border bg-stone-900 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold-500/50',
                  chosen ? 'border-gold-500' : 'border-stone-700 hover:border-stone-500',
                  saving !== null && 'cursor-wait opacity-70',
                )}
              >
                <input
                  type="radio"
                  name="login-theme"
                  value={theme.id}
                  checked={chosen}
                  onChange={() => change('loginTheme', theme.id)}
                  className="sr-only"
                />

                {theme.image ? (
                  <Backdrop src={backdrop(theme.image)} className="aspect-[256/173] w-full" />
                ) : (
                  // the four scenes it moves between through the year
                  <span className="grid aspect-[256/173] w-full grid-cols-2 grid-rows-2">
                    {SCENES.map((scene) => (
                      <Backdrop key={scene.id} src={backdrop(scene.image)} className="h-full w-full" />
                    ))}
                  </span>
                )}

                <span className="flex flex-1 flex-col gap-1 p-3">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      chosen ? 'text-gold-400' : 'text-text-primary',
                    )}
                  >
                    {theme.label}
                    {chosen && <span className="sr-only"> (current)</span>}
                  </span>
                  <span className="text-xs text-text-secondary">{theme.description}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
        <Image
          src="/brand/logo-halloween@2x.gif"
          alt=""
          width={144}
          height={60}
          unoptimized
          className="shrink-0"
        />

        <div className="flex-1">
          <p id="halloween-logo-label" className="text-sm font-medium text-text-primary">
            Halloween logo
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            The logo with its letters burning with green ghost-fire, in place of the usual one
            in the navigation and on the home page. The game client shows it with its Halloween
            login theme whatever this is set to.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={settings.halloweenLogo}
          aria-labelledby="halloween-logo-label"
          disabled={saving !== null}
          onClick={() => change('halloweenLogo', !settings.halloweenLogo)}
          className={cn(
            'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 disabled:opacity-60',
            settings.halloweenLogo
              ? 'border-gold-500 bg-gold-500/80'
              : 'border-stone-600 bg-stone-900',
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 rounded-full bg-parchment shadow transition-transform',
              settings.halloweenLogo ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
      </div>
    </section>
  )
}
