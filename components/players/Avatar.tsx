'use client'

import { useEffect, useRef, useState } from 'react'

import { RSCAvatar, type PlayerAppearance } from '@/lib/avatar'

interface AvatarProps {
  appearance: PlayerAppearance | null | undefined
}

/**
 * Renders a RuneScape Classic player avatar, drawn from the game's entity
 * sprites and the player's stored appearance (head, body, colours, equipment).
 *
 * If appearance is missing or unrenderable, nothing is shown. The canvas
 * is rendered at 2x scale (172x230 px for the 86x115 game sprite) for
 * retina clarity.
 */
export function PlayerAvatar({ appearance }: AvatarProps) {
  // this div is never given React children -- the effect below is the only
  // thing that ever writes to it. keeping it untouched by JSX means React's
  // own reconciliation can never collide with the manual appendChild, which
  // is what throws "removeChild ... not a child of this node" if the two
  // mutate the same node
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!appearance) return

    // status already starts at 'loading'; a new `appearance` only ever
    // arrives via a fresh page navigation, which remounts this component,
    // so there's no stale 'ready' state to reset here
    let cancelled = false

    RSCAvatar.player({ ...appearance, scale: 2 })
      .then((canvas) => {
        if (cancelled || !canvasHostRef.current) return

        canvasHostRef.current.replaceChildren(canvas)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [appearance])

  if (!appearance) return null

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-end justify-center min-w-[196px] min-h-[254px] p-3 bg-stone-800/40 border border-stone-700 rounded">
        {/* canvas-only node: React never renders children into this one */}
        <div ref={canvasHostRef} />

        {status !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-sm text-text-muted">
              {status === 'loading' ? 'Loading avatar...' : 'Avatar unavailable.'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
