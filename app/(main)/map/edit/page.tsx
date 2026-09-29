import type { Metadata } from 'next'

import { WorldEditorGate } from '@/components/world-map/WorldEditorGate'

export const metadata: Metadata = {
  title: 'World Editor',
}

export default function WorldEditorPage() {
  return <WorldEditorGate />
}
