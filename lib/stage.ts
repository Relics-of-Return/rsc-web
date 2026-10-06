import 'server-only'

import fs from 'node:fs'
import path from 'node:path'

/**
 * The checkout the website's editors (world map, lighting, models) read and
 * write. Game code and data are only changed in the dev stage
 * (documentation/RELEASE_CHANNELS.md), so they use rsc-server-dev and
 * rsc-client-dev when those exist, and the plain folders on a checkout without
 * stages. RSC_EDITOR_STAGE=beta or =live points them elsewhere; the per-file
 * RSC_*_DIR overrides still win over all of this.
 */
export function editorCheckout(name: 'rsc-client' | 'rsc-server'): string {
  const root = path.join(/*turbopackIgnore: true*/ process.cwd(), '..')
  const stage = process.env.RSC_EDITOR_STAGE ?? 'dev'

  if (stage !== 'live') {
    const staged = path.join(/*turbopackIgnore: true*/ root, `${name}-${stage}`)

    if (fs.existsSync(/*turbopackIgnore: true*/ staged)) {
      return staged
    }
  }

  return path.join(/*turbopackIgnore: true*/ root, name)
}
