import { promises as fs } from 'fs'
import path from 'path'

import { NextResponse, type NextRequest } from 'next/server'

// The launcher's self-update files: latest.json, the installers and their
// .sig files, which rsc-tauri-client/scripts/publish-launcher.cjs copies into
// rsc-web/downloads/launcher/. Read from disk on each request (not from
// public/), so a release published while the site runs - dev or `next
// start` - is served straight away, and binaries stay out of git.
export const dynamic = 'force-dynamic'

const FOLDER = path.join(process.cwd(), 'downloads', 'launcher')

// latest.json, x.y.z installers, their .sig files - nothing with a path in it
const SAFE_NAME = /^[A-Za-z0-9._-]+$/

const TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.sig': 'text/plain; charset=utf-8',
  '.exe': 'application/vnd.microsoft.portable-executable',
  '.msi': 'application/x-msi',
  '.gz': 'application/gzip',
  '.appimage': 'application/octet-stream',
  '.deb': 'application/vnd.debian.binary-package',
  '.dmg': 'application/x-apple-diskimage',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params

  if (!SAFE_NAME.test(file) || file.startsWith('.')) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  try {
    const data = await fs.readFile(path.join(FOLDER, file))
    const type = TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream'

    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': type,
        // the manifest must never be stale; installers are versioned names
        'Cache-Control': file === 'latest.json' ? 'no-store' : 'public, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
}
