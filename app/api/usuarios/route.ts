import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarEmailBoasVindas } from '@/lib/email'

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, senha, nome, telefone, endereco, token } = body

    console.log('📥 Requisição recebida:', { email, nome, telefone })

    // Validação
    if (!email || !senha || !nome || !telefone) {
      console.error('❌ Campos obrigatórios faltando')
      return NextResponse.json(
        { erro: 'Campos obrigatórios: email, senha, nome, telefone' },
        { status: 400 }
      )
    }

    // Verificar token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Token inválido:', authError?.message)
      return NextResponse.json(
        { erro: 'Token inválido ou expirado' },
        { status: 401 }
      )
    }

    console.log('✅ Token validado para usuário:', user.id)

    // Verificar se é master
    const { data: usuarioLogado, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .select('is_master')
      .eq('id', user.id)
      .single()

    if (usuarioError) {
      console.error('❌ Erro ao verificar master:', usuarioError.message)
      return NextResponse.json(
        { erro: `Erro ao verificar permissões: ${usuarioError.message}` },
        { status: 500 }
      )
    }

    if (!usuarioLogado?.is_master) {
      console.error('❌ Usuário não é master')
      return NextResponse.json(
        { erro: 'Apenas usuários master podem cadastrar' },
        { status: 403 }
      )
    }

    console.log('✅ Usuário master verificado')

    // Criar usuário no Supabase Auth
    console.log('🔄 Criando usuário no Auth...')
    
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })

    if (createAuthError) {
      console.error('❌ Erro ao criar no Auth:', createAuthError.message)
      
      if (createAuthError.message.includes('already registered')) {
        return NextResponse.json(
          { erro: 'Este email já está cadastrado' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { erro: `Erro ao criar usuário: ${createAuthError.message}` },
        { status: 500 }
      )
    }

    if (!authData?.user) {
      console.error('❌ Auth não retornou usuário')
      return NextResponse.json(
        { erro: 'Falha ao criar usuário no sistema de autenticação' },
        { status: 500 }
      )
    }

    console.log('✅ Usuário criado no Auth:', authData.user.id)

    // Inserir na tabela usuarios
    console.log('🔄 Inserindo na tabela usuarios...')
    
    const { data: novoUsuario, error: insertError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authData.user.id,
        email,
        nome,
        telefone,
        endereco: endereco || null,
        is_master: false,
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Erro ao inserir na tabela:', insertError.message)
      
      // Rollback: deletar do Auth
      console.log('🔄 Fazendo rollback...')
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json(
        { erro: `Erro ao salvar dados: ${insertError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Usuário salvo na tabela')

    // Enviar email
    try {
      await enviarEmailBoasVindas(email, nome, senha)
      console.log('✅ Email enviado')
    } catch (emailError: any) {
      console.error('⚠️ Erro ao enviar email:', emailError.message)
    }

    return NextResponse.json({ 
      sucesso: true, 
      usuario: novoUsuario 
    }, { status: 201 })

  } catch (error: any) {
    console.error('❌ ERRO GERAL:', error)
    return NextResponse.json(
      { erro: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ erro: 'Token não fornecido' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
    }

    const { data: usuarios, error } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Erro ao buscar usuários:', error.message)
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    return NextResponse.json(usuarios)

  } catch (error: any) {
    console.error('❌ Erro no GET:', error)
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}