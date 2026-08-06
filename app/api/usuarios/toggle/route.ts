import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ativo, token } = body

    // Valida dados obrigatórios
    if (!id || ativo === undefined || !token) {
      return NextResponse.json(
        { erro: 'Campos obrigatórios: id, ativo, token' },
        { status: 400 }
      )
    }

    // Cria cliente Supabase com chave anon
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Valida o token e obtém o usuário logado
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { erro: 'Sessão inválida ou expirada' },
        { status: 401 }
      )
    }

    console.log('Usuário autenticado:', user.id)

    // Verifica se o usuário logado é master
    const { data: usuarioLogado, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .select('is_master')
      .eq('id', user.id)
      .single()

    if (usuarioError) {
      console.error('Erro ao verificar permissões:', usuarioError)
      return NextResponse.json(
        { erro: `Erro ao verificar permissões: ${usuarioError.message}` },
        { status: 500 }
      )
    }

    if (!usuarioLogado?.is_master) {
      return NextResponse.json(
        { erro: 'Apenas usuários master podem ativar/desativar usuários' },
        { status: 403 }
      )
    }

    // Não permite desativar o próprio usuário
    if (id === user.id) {
      return NextResponse.json(
        { erro: 'Você não pode desativar sua própria conta' },
        { status: 400 }
      )
    }

    console.log(`Alterando usuário ${id} para ativo=${ativo}`)

    // Atualiza o status do usuário
    const { error: updateError } = await supabaseAdmin
      .from('usuarios')
      .update({ ativo })
      .eq('id', id)

    if (updateError) {
      console.error('Erro ao atualizar usuário:', updateError)
      return NextResponse.json(
        { erro: `Erro ao atualizar usuário: ${updateError.message}` },
        { status: 500 }
      )
    }

    console.log(`✅ Usuário ${id} ${ativo ? 'ativado' : 'desativado'}`)

    return NextResponse.json({ 
      sucesso: true,
      mensagem: `Usuário ${ativo ? 'ativado' : 'desativado'} com sucesso`
    })

  } catch (error: any) {
    console.error('❌ Erro no PATCH /api/usuarios/toggle:', error)
    return NextResponse.json(
      { erro: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}