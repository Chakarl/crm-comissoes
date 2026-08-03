import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (token) {
      await supabaseAdmin.from('sessoes').delete().eq('token', token)
    }

    const response = NextResponse.json({ sucesso: true })
    response.cookies.delete('auth_token')

    return response

  } catch (error) {
    console.error('Erro no logout:', error)
    return NextResponse.json({ erro: 'Erro no servidor' }, { status: 500 })
  }
}