import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(req: NextRequest) {
  try {
    const { id, nome, telefone, endereco, token } = await req.json()

    // Verifica se quem chamou é master
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const { data: caller } = await supabaseAdmin
      .from('usuarios')
      .select('is_master')
      .eq('id', user.id)
      .single()

    if (!caller?.is_master) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    // Atualiza na tabela
    const { error } = await supabaseAdmin
      .from('usuarios')
      .update({ nome, telefone, endereco })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ mensagem: 'Usuário atualizado com sucesso' })
  } catch (error: any) {
    console.error('Erro ao editar usuário:', error)
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}