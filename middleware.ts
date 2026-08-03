import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas (não precisam de autenticação)
  const rotasPublicas = ['/login']
  
  if (rotasPublicas.includes(pathname)) {
    return NextResponse.next()
  }

  // Verificar se tem token no cookie
  const token = request.cookies.get('auth_token')?.value

  if (!token) {
    // Redireciona para login se não tiver token
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

// Aplicar middleware em todas as rotas exceto arquivos estáticos e API
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}