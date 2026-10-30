import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getRouteMarkdown } from '@/lib/markdown'

export function proxy(request: NextRequest) {
  const accept = request.headers.get('accept') || ''
  const pathname = request.nextUrl.pathname

  // Markdown content negotiation for AI agents and LLM clients
  if (accept.includes('text/markdown')) {
    const markdown = getRouteMarkdown(pathname)
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'Vary': 'Accept',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ttf|woff|woff2)).*)',
  ],
}

