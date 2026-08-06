import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(req: NextRequest) {
  try {
    const { id, token } = await req.json()

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

    // Verifica se o alvo não é master
    const { data: alvo } = await supabaseAdmin
      .from('usuarios')
      .select('is_master')
      .eq('id', id)
      .single()

    if (alvo?.is_master) {
      return NextResponse.json({ erro: 'Não é possível excluir um usuário master' }, { status: 403 })
    }

    // 1. Deleta da tabela primeiro (evita FK)
    const { error: dbError } = await supabaseAdmin
      .from('usuarios')
      .delete()
      .eq('id', id)

    if (dbError) throw dbError

    // 2. Deleta do Auth
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (authDeleteError) throw authDeleteError

    return NextResponse.json({ mensagem: 'Usuário excluído com sucesso' })
  } catch (error: any) {
    console.error('Erro ao excluir usuário:', error)
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}