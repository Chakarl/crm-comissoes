import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PATCH(request: Request) {
  try {
    const { id, ativo, token } = await request.json()

    if (!id || ativo === undefined || !token) {
      return NextResponse.json({ erro: 'Dados incompletos' }, { status: 400 })
    }

    const { data: sessao } = await supabaseAdmin
      .from('sessoes')
      .select('usuario_id')
      .eq('token', token)
      .gte('expira_em', new Date().toISOString())
      .single()

    if (!sessao) {
      return NextResponse.json({ erro: 'Sessão inválida' }, { status: 401 })
    }

    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('is_master')
      .eq('id', sessao.usuario_id)
      .single()

    if (!usuario?.is_master) {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
    }

    await supabaseAdmin
      .from('usuarios')
      .update({ ativo })
      .eq('id', id)

    return NextResponse.json({ sucesso: true })

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json({ erro: 'Erro no servidor' }, { status: 500 })
  }
}