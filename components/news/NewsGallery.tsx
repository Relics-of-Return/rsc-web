'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import type { NewsImage } from '@/lib/news-format'
import { cn } from '@/lib/utils'
import { RichInline } from './NewsRichText'

const GALLERY_COLUMNS = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' } as const

export function NewsGallery({ images, columns }: { images: NewsImage[]; columns: 2 | 3 | 4 }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const swipeFrom = useRef<number | null>(null)
  const [shown, setShown] = useState<number | null>(null)
  const isOpen = shown !== null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (!isOpen) {
      if (dialog.open) dialog.close()
      return
    }

    if (!dialog.open) dialog.showModal()
    const html = document.documentElement
    const overflow = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = overflow
    }
  }, [isOpen])

  const step = (by: number) => setShown((index) => (index === null ? null : (index + by + images.length) % images.length))

  const openAt = (event: MouseEvent<HTMLAnchorElement>, index: number) => {
    // a ctrl, shift or middle click still opens the picture on its own
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    setShown(index)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'ArrowLeft') step(-1)
    else if (event.key === 'ArrowRight') step(1)
    else return
    event.preventDefault()
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (swipeFrom.current === null) return
    const distance = event.clientX - swipeFrom.current
    swipeFrom.current = null
    if (Math.abs(distance) > 50 && images.length > 1) step(distance > 0 ? -1 : 1)
  }

  const current = shown === null ? null : images[shown]
  const several = images.length > 1
  const control = 'absolute z-10 rounded-full border border-stone-600 bg-stone-950/80 p-2 text-text-primary transition-colors hover:border-gold-500/60 hover:text-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/70'

  return (
    <>
      <div className={cn('clear-both grid grid-cols-2 gap-3', GALLERY_COLUMNS[columns])}>
        {images.map((image, index) => (
          <figure key={index}>
            <a
              href={image.src}
              onClick={(event) => openAt(event, index)}
              aria-label={`View ${image.alt || 'picture'} larger`}
              className="block cursor-zoom-in overflow-hidden rounded-md border border-stone-700 transition-colors hover:border-gold-500/60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- news images are uploads served by the API */}
              <img src={image.src} alt={image.alt} loading="lazy" className="aspect-video w-full object-cover" />
            </a>
            {image.caption.trim() && (
              <figcaption className="mt-1.5 text-center text-xs text-text-muted">
                <RichInline text={image.caption} />
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        aria-label="Picture viewer"
        onCancel={(event) => {
          event.preventDefault()
          setShown(null)
        }}
        onClose={() => setShown(null)}
        onKeyDown={onKeyDown}
        className="m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-text-primary backdrop:bg-black/90"
      >
        {current && (
          <div
            className="relative flex h-full w-full flex-col items-center justify-center gap-3 p-4 sm:p-10"
            onClick={(event) => event.target === event.currentTarget && setShown(null)}
            onPointerDown={(event) => {
              swipeFrom.current = event.clientX
            }}
            onPointerUp={onPointerUp}
          >
            <button type="button" aria-label="Close" title="Close (Esc)" onClick={() => setShown(null)} className={cn(control, 'right-3 top-3')}>
              <X className="h-5 w-5" />
            </button>

            {several && (
              <>
                <button type="button" aria-label="Previous picture" title="Previous (←)" onClick={() => step(-1)} className={cn(control, 'left-2 top-1/2 -translate-y-1/2 sm:left-4')}>
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button type="button" aria-label="Next picture" title="Next (→)" onClick={() => step(1)} className={cn(control, 'right-2 top-1/2 -translate-y-1/2 sm:right-4')}>
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element -- news images are uploads served by the API */}
            <img
              src={current.src}
              alt={current.alt}
              draggable={false}
              className="max-h-[calc(100dvh-7rem)] max-w-full select-none rounded-md border border-stone-700 object-contain shadow-2xl shadow-black"
            />

            <div className="flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-sm text-text-secondary">
              {current.caption.trim() && (
                <span className="text-text-primary">
                  <RichInline text={current.caption} />
                </span>
              )}
              {several && (
                <span className="text-xs text-text-muted">
                  {(shown ?? 0) + 1} / {images.length}
                </span>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
