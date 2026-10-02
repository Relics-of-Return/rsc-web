import type { Metadata } from 'next'

import { ModelEditorGate } from '@/components/model-editor/ModelEditorGate'

export const metadata: Metadata = {
  title: 'Model Editor',
}

export default function ModelEditorPage() {
  return <ModelEditorGate />
}
