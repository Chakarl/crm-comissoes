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
    console.log('📥 Body recebido:', body)

    const { email, senha, nome, telefone, endereco, token } = body

    // Validação
    if (!email || !senha || !nome || !telefone) {
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
      console.error('❌ Erro de autenticação:', authError)
      return NextResponse.json(
        { erro: 'Token inválido ou expirado' },
        { status: 401 }
      )
    }

    // Verificar se é master
    const { data: usuarioLogado, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .select('is_master')
      .eq('id', user.id)
      .single()

    if (usuarioError || !usuarioLogado?.is_master) {
      console.error('❌ Usuário não é master:', usuarioError)
      return NextResponse.json(
        { erro: 'Acesso negado. Apenas usuários master podem cadastrar.' },
        { status: 403 }
      )
    }

    console.log('✅ Usuário master verificado:', user.id)

    // Criar usuário no Supabase Auth
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })

    if (createAuthError) {
      console.error('❌ Erro ao criar usuário no Auth:', createAuthError)
      
      if (createAuthError.message.includes('already registered')) {
        return NextResponse.json(
          { erro: 'Este email já está cadastrado no sistema' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { erro: `Erro ao criar usuário: ${createAuthError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Usuário criado no Auth:', authData.user.id)

    // Inserir na tabela usuarios
    const { data: novoUsuario, error: insertError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authData.user.id,
        email,
        nome,
        telefone,
        endereco,
        is_master: false,
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Erro ao inserir na tabela usuarios:', insertError)
      
      // Tentar deletar o usuário do Auth se falhar
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json(
        { erro: `Erro ao salvar dados: ${insertError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Usuário salvo na tabela:', novoUsuario.id)

    // Enviar email
    try {
      await enviarEmailBoasVindas(email, nome, senha)
      console.log('✅ Email enviado para:', email)
    } catch (emailError) {
      console.error('⚠️ Erro ao enviar email (não crítico):', emailError)
    }

    return NextResponse.json({ 
      sucesso: true, 
      usuario: novoUsuario 
    })

  } catch (error: any) {
    console.error('❌ Erro geral:', error)
    return NextResponse.json(
      { erro: error.message || 'Erro interno no servidor' },
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
      console.error('Erro ao buscar usuários:', error)
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    return NextResponse.json(usuarios)

  } catch (error: any) {
    console.error('Erro geral no GET:', error)
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}