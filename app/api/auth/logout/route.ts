import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (token) {
      await supabase.from('sessoes').delete().eq('token', token)
    }

    const response = NextResponse.json({ sucesso: true })
    
    // Remover cookie
    response.cookies.delete('auth_token')

    return response

  } catch (error) {
    console.error('Erro no logout:', error)
    return NextResponse.json({ erro: 'Erro no servidor' }, { status: 500 })
  }
}