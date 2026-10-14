import { NextResponse, type NextRequest } from 'next/server'

import { isRefusal, requireStaff } from '@/lib/landscape/auth'
import { addRuns, forgetRun, readRuns } from '@/lib/landscape/pcg-runs'

// what the world editor's PCG tool has placed, run by run (pcg-runs.json), so
// a past run can be cleaned up or made again
export const dynamic = 'force-dynamic'

const failure = (error: unknown, status: number) =>
  NextResponse.json(
    { error: error instanceof Error ? error.message : 'the PCG runs could not be read' },
    { status },
  )

export async function GET(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  try {
    return NextResponse.json({ runs: readRuns() })
  } catch (error) {
    return failure(error, 500)
  }
}

export async function POST(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'expected JSON' }, { status: 400 })
  }

  try {
    return NextResponse.json({ runs: addRuns(body.runs, session.username) })
  } catch (error) {
    return failure(error, 400)
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  const id = request.nextUrl.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  try {
    return NextResponse.json({ runs: forgetRun(id) })
  } catch (error) {
    return failure(error, 500)
  }
}
