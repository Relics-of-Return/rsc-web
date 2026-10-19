import { NextResponse } from 'next/server'

import { getTicker } from '@/lib/ticker'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await getTicker())
}
