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
      console.error('Erro ao buscar usuários:', error)
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    return NextResponse.json(usuarios || [])

  } catch (error: any) {
    console.error('Erro no GET /api/usuarios:', error)
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, senha, nome, telefone, endereco, token } = body

    if (!email || !senha || !nome || !telefone) {
      return NextResponse.json(
        { erro: 'Campos obrigatórios: email, senha, nome, telefone' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { erro: 'Token inválido ou expirado' },
        { status: 401 }
      )
    }

    const { data: usuarioLogado, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .select('is_master')
      .eq('id', user.id)
      .single()

    if (usuarioError) {
      console.error('Erro ao verificar master:', usuarioError)
      return NextResponse.json(
        { erro: `Erro ao verificar permissões: ${usuarioError.message}` },
        { status: 500 }
      )
    }

    if (!usuarioLogado?.is_master) {
      return NextResponse.json(
        { erro: 'Apenas usuários master podem cadastrar' },
        { status: 403 }
      )
    }

    console.log('Criando usuário no Auth:', email)
    
    // CORRIGIDO: Remove email_confirm e adiciona app_metadata para confirmar automaticamente
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: false, // Não tenta enviar email do Supabase
      user_metadata: {
        nome: nome
      }
    })

    if (createAuthError) {
      console.error('Erro ao criar no Auth:', createAuthError)
      
      if (createAuthError.message?.includes('already registered') || 
          createAuthError.message?.includes('already exists')) {
        return NextResponse.json(
          { erro: 'Este email já está cadastrado no sistema' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { erro: `Erro ao criar usuário: ${createAuthError.message || 'Erro desconhecido'}` },
        { status: 500 }
      )
    }

    if (!authData?.user) {
      console.error('Auth não retornou usuário')
      return NextResponse.json(
        { erro: 'Falha ao criar usuário no sistema de autenticação' },
        { status: 500 }
      )
    }

    console.log('Usuário criado no Auth:', authData.user.id)

    // ADICIONAL: Confirma o email manualmente via Admin API
    try {
      await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
        email_confirm: true
      })
      console.log('Email confirmado automaticamente')
    } catch (confirmError) {
      console.warn('Aviso: não foi possível confirmar email automaticamente:', confirmError)
      // Não bloqueia o cadastro
    }

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
      console.error('Erro ao inserir na tabela:', insertError)
      
      // Reverte criação no Auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json(
        { erro: `Erro ao salvar dados: ${insertError.message}` },
        { status: 500 }
      )
    }

    console.log('Usuário salvo na tabela')

    // Envia email customizado (não depende do SMTP do Supabase)
    try {
      await enviarEmailBoasVindas(email, nome, senha)
      console.log('Email de boas-vindas enviado')
    } catch (emailError: any) {
      console.error('Erro ao enviar email (não crítico):', emailError)
      // Não bloqueia o cadastro
    }

    return NextResponse.json({ 
      sucesso: true, 
      usuario: novoUsuario 
    }, { status: 201 })

  } catch (error: any) {
    console.error('Erro no POST /api/usuarios:', error)
    return NextResponse.json(
      { erro: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}