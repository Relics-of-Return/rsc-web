'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { ImagePlus, Trash2, Upload } from 'lucide-react'

import { Input } from '@/components/ui/Input'
import { uploadNewsImage } from '@/lib/api'
import { safeImageSrc } from '@/lib/news-format'
import { SmallButton, uploadErrorMessage } from './fields'

export const IMAGE_TYPES = 'image/png,image/jpeg,image/gif,image/webp'

export function altFromFile(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
}

export function ImageField({ src, alt, onChange }: { src: string; alt: string; onChange: (image: { src: string; alt: string }) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const preview = safeImageSrc(src)

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setBusy(true)
    setError(null)

    try {
      const result = await uploadNewsImage(file)
      onChange({ src: result.url, alt: alt || altFromFile(file.name) })
    } catch (uploadError) {
      setError(uploadErrorMessage(uploadError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex gap-3">
      <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded border border-dashed border-stone-700 bg-stone-950">
        {/* eslint-disable-next-line @next/next/no-img-element -- news images are uploads served by the API */}
        {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6 text-text-muted" aria-hidden />}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap gap-2">
          <input ref={inputRef} type="file" accept={IMAGE_TYPES} onChange={upload} className="sr-only" tabIndex={-1} />
          <SmallButton onClick={() => inputRef.current?.click()} disabled={busy}>
            <Upload className="h-3.5 w-3.5" />
            {busy ? 'Uploading…' : preview ? 'Replace' : 'Upload picture'}
          </SmallButton>
          {preview && (
            <SmallButton onClick={() => onChange({ src: '', alt })}>
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </SmallButton>
          )}
        </div>
        <Input value={alt} onChange={(event) => onChange({ src, alt: event.target.value })} placeholder="Describe the picture (alt text)" className="px-2.5 py-1.5 text-xs" />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  )
}
