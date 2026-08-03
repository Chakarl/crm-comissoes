import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ erro: 'Token não fornecido' }, { status: 400 })
    }

    await supabase.from('sessoes').delete().eq('token', token)

    return NextResponse.json({ sucesso: true })

  } catch (error) {
    console.error('Erro no logout:', error)
    return NextResponse.json({ erro: 'Erro no servidor' }, { status: 500 })
  }
}