import { NextResponse, type NextRequest } from 'next/server'

import { isRefusal, requireStaff } from '@/lib/landscape/auth'
import {
  InvalidModel,
  ModelConflict,
  ModelNotFound,
  canWrite,
  readSource,
  writeSource,
} from '@/lib/models/store'

// one model source: read it, save it (PUT), or make a new one (POST). the
// text is only ever stored - the browser is what runs it, to draw it
export const dynamic = 'force-dynamic'

function refusal(error: unknown) {
  const message = error instanceof Error ? error.message : 'something went wrong'

  if (error instanceof ModelNotFound) {
    return NextResponse.json({ error: message }, { status: 404 })
  }

  if (error instanceof ModelConflict) {
    return NextResponse.json({ error: message }, { status: 409 })
  }

  if (error instanceof InvalidModel) {
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json({ error: message }, { status: 500 })
}

export async function GET(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  try {
    return NextResponse.json(readSource(request.nextUrl.searchParams.get('name') ?? ''))
  } catch (error) {
    return refusal(error)
  }
}

async function save(request: NextRequest, create: boolean) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  if (!canWrite()) {
    return NextResponse.json({ error: 'the model editor is read-only here' }, { status: 403 })
  }

  let body: { source?: unknown; expected?: unknown }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'expected a JSON body' }, { status: 400 })
  }

  try {
    const result = writeSource(
      request.nextUrl.searchParams.get('name') ?? '',
      typeof body.source === 'string' ? body.source : '',
      {
        create,
        expected: typeof body.expected === 'number' ? body.expected : null,
      },
    )

    console.log(`[model editor] ${session.username} ${create ? 'created' : 'saved'} ${request.nextUrl.searchParams.get('name')}`)

    return NextResponse.json(result)
  } catch (error) {
    return refusal(error)
  }
}

export async function PUT(request: NextRequest) {
  return save(request, false)
}

export async function POST(request: NextRequest) {
  return save(request, true)
}
