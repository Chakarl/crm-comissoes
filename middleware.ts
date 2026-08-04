import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase-middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas
  if (pathname === '/login') {
    return NextResponse.next()
  }

  const { supabase, response } = createMiddlewareClient(request)

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}