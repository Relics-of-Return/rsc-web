import { type NextRequest } from 'next/server'

import { isRefusal, requireStaff } from '@/lib/landscape/auth'
import { onChange, type ModelEvent } from '@/lib/models/store'

// server-sent events: a message whenever a model source or texture changes on
// disk - a save from any editor, or the file edited by hand - so every open
// editor redraws it at once
export const dynamic = 'force-dynamic'

const KEEP_ALIVE = 20_000

export async function GET(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  const encoder = new TextEncoder()
  let stop = () => {}

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text))
        } catch {
          stop()
        }
      }

      const unsubscribe = onChange((event: ModelEvent) => {
        send(`event: change\ndata: ${JSON.stringify(event)}\n\n`)
      })

      const keepAlive = setInterval(() => send(': still here\n\n'), KEEP_ALIVE)

      stop = () => {
        unsubscribe()
        clearInterval(keepAlive)
      }

      request.signal.addEventListener('abort', () => {
        stop()

        try {
          controller.close()
        } catch {
          // already gone
        }
      })

      send('event: ready\ndata: {}\n\n')
    },
    cancel() {
      stop()
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      connection: 'keep-alive',
    },
  })
}
