import { promises as fs } from 'fs'
import path from 'path'

import { NextResponse, type NextRequest } from 'next/server'

// The launcher's Plugin Hub: index.json (+ .sig) and each plugin's files at
// <id>/<version>/<file>, which rsc-tauri-client/scripts/publish-plugins.cjs
// writes into rsc-web/downloads/plugins/. Read from disk on each request, so
// a plugin published while the site runs is served straight away.
export const dynamic = 'force-dynamic'

const FOLDER = path.join(process.cwd(), 'downloads', 'plugins')

// each part plain: no dots in front, nothing that climbs out of the folder
const SAFE_PART = /^[A-Za-z0-9_+-][A-Za-z0-9._+-]*$/

const TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.sig': 'text/plain; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const parts = (await params).path

  if (!parts.length || parts.length > 8 || !parts.every((p) => SAFE_PART.test(p))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  try {
    const file = path.join(FOLDER, ...parts)
    const data = await fs.readFile(file)
    const type = TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
    const index = parts.length === 1

    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': type,
        // the index must never be stale; plugin files sit under their version
        'Cache-Control': index ? 'no-store' : 'public, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
}
