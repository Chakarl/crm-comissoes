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
    
    // Usa signUp em vez de admin.createUser para evitar dependência do SMTP do Supabase
    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome },
        emailRedirectTo: undefined // Desabilita redirect de confirmação
      }
    })

    if (signUpError) {
      console.error('Erro ao criar usuário:', signUpError)
      
      if (signUpError.message?.includes('already registered') || 
          signUpError.message?.includes('already exists') ||
          signUpError.message?.includes('User already registered')) {
        return NextResponse.json(
          { erro: 'Este email já está cadastrado no sistema' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { erro: `Erro ao criar usuário: ${signUpError.message}` },
        { status: 500 }
      )
    }

    if (!signUpData?.user) {
      console.error('SignUp não retornou usuário')
      return NextResponse.json(
        { erro: 'Falha ao criar usuário no sistema de autenticação' },
        { status: 500 }
      )
    }

    console.log('Usuário criado no Auth:', signUpData.user.id)

    // Confirma email manualmente usando Admin API (bypass do email do Supabase)
    try {
      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
        signUpData.user.id,
        { email_confirm: true }
      )
      
      if (confirmError) {
        console.warn('Aviso ao confirmar email:', confirmError)
      } else {
        console.log('Email confirmado automaticamente via Admin API')
      }
    } catch (confirmError) {
      console.warn('Não foi possível confirmar email automaticamente:', confirmError)
      // Não bloqueia o cadastro
    }

    const { data: novoUsuario, error: insertError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: signUpData.user.id,
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
      try {
        await supabaseAdmin.auth.admin.deleteUser(signUpData.user.id)
        console.log('Usuário revertido do Auth')
      } catch (deleteError) {
        console.error('Erro ao reverter usuário:', deleteError)
      }
      
      return NextResponse.json(
        { erro: `Erro ao salvar dados: ${insertError.message}` },
        { status: 500 }
      )
    }

    console.log('Usuário salvo na tabela com sucesso')

    // Envia email customizado (seu próprio sistema de email)
    try {
      await enviarEmailBoasVindas(email, nome, senha)
      console.log('Email de boas-vindas enviado com sucesso')
    } catch (emailError: any) {
      console.warn('Aviso: email de boas-vindas não enviado (não crítico):', emailError.message)
      // Não bloqueia o cadastro mesmo se o email falhar
    }

    return NextResponse.json({ 
      sucesso: true, 
      usuario: novoUsuario 
    }, { status: 201 })

  } catch (error: any) {
    console.error('Erro inesperado no POST /api/usuarios:', error)
    return NextResponse.json(
      { erro: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}