'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// the game client runs on its own origin. its in-game world switcher asks
// this page to do the switch (rsc-client's src/title-screen.js), so the
// address here always names the world being played
export function GameFrame({ clientURL, title }: { clientURL: string; title: string }) {
  const router = useRouter()

  useEffect(() => {
    const origin = new URL(clientURL).origin

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin || event.data?.type !== 'rsc:switch-world') {
        return
      }

      const world = Number(event.data.world)

      if (Number.isInteger(world)) {
        router.push(`/play?world=${world}`)
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [clientURL, router])

  return (
    <iframe
      src={clientURL}
      title={title}
      allow="fullscreen; autoplay; clipboard-write"
      className="block h-[calc(100vh_-_11rem)] min-h-[520px] w-full rounded-md border-0 bg-black"
    />
  )
}
