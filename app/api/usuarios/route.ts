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
  console.log('=== INÍCIO GET /api/usuarios ===')
  
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    console.log('1. Token presente:', !!token)

    if (!token) {
      console.error('ERRO: Token não fornecido')
      return NextResponse.json({ erro: 'Token não fornecido' }, { status: 401 })
    }

    console.log('2. Criando cliente Supabase...')
    console.log('   NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'OK' : 'FALTANDO')
    console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'OK' : 'FALTANDO')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    console.log('3. Validando token...')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError) {
      console.error('ERRO ao validar token:', authError.message)
      return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
    }

    if (!user) {
      console.error('ERRO: Token válido mas sem usuário')
      return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 401 })
    }

    console.log('4. Token validado. User ID:', user.id)

    console.log('5. Verificando variáveis de ambiente do Admin...')
    console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'FALTANDO')

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('ERRO CRÍTICO: SUPABASE_SERVICE_ROLE_KEY não configurada')
      return NextResponse.json({ 
        erro: 'Configuração do servidor incompleta (SERVICE_ROLE_KEY)' 
      }, { status: 500 })
    }

    console.log('6. Buscando usuários na tabela...')
    const { data: usuarios, error } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('ERRO ao buscar usuários:', error.message)
      console.error('Detalhes do erro:', JSON.stringify(error, null, 2))
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    console.log('7. Usuários encontrados:', usuarios?.length || 0)
    console.log('=== FIM GET /api/usuarios (SUCESSO) ===')

    return NextResponse.json(usuarios || [])

  } catch (error: any) {
    console.error('=== ERRO GERAL NO GET ===')
    console.error('Mensagem:', error.message)
    console.error('Stack:', error.stack)
    console.error('==========================')
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  console.log('=== INÍCIO POST /api/usuarios ===')
  
  // Verificação de variáveis de ambiente
  console.log('🔑 Verificando variáveis de ambiente...')
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'OK' : '❌ FALTANDO')
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'OK' : '❌ FALTANDO')
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? `OK (${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...)` : '❌ FALTANDO')

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY não está configurada!')
    return NextResponse.json(
      { erro: 'Configuração do servidor incompleta. Contate o administrador.' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const { email, senha, nome, telefone, endereco, token } = body

    console.log('1. Body recebido:', { email, nome, telefone })

    if (!email || !senha || !nome || !telefone) {
      console.error('ERRO: Campos obrigatórios faltando')
      return NextResponse.json(
        { erro: 'Campos obrigatórios: email, senha, nome, telefone' },
        { status: 400 }
      )
    }

    console.log('2. Validando token...')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('ERRO ao validar token:', authError?.message)
      return NextResponse.json(
        { erro: 'Token inválido ou expirado' },
        { status: 401 }
      )
    }

    console.log('3. Token validado. User ID:', user.id)

    console.log('4. Verificando se é master...')
    const { data: usuarioLogado, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .select('is_master')
      .eq('id', user.id)
      .single()

    if (usuarioError) {
      console.error('ERRO ao verificar master:', usuarioError.message)
      return NextResponse.json(
        { erro: `Erro ao verificar permissões: ${usuarioError.message}` },
        { status: 500 }
      )
    }

    if (!usuarioLogado?.is_master) {
      console.error('ERRO: Usuário não é master')
      return NextResponse.json(
        { erro: 'Apenas usuários master podem cadastrar' },
        { status: 403 }
      )
    }

    console.log('5. Usuário master verificado')

    console.log('6. Criando usuário no Auth...')
    console.log('   Email:', email)
    console.log('   Senha tem:', senha.length, 'caracteres')

    // Tentativa 1: com email_confirm
    let authData: any = null
    let createAuthError: any = null

    const resultado1 = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome,
        telefone,
        endereco: endereco || null
      }
    })

    authData = resultado1.data
    createAuthError = resultado1.error

    // Se der erro vazio, tenta sem email_confirm
    if (createAuthError && (!createAuthError.message || createAuthError.message === '{}')) {
      console.log('⚠️ Erro vazio detectado. Tentando sem email_confirm...')
      
      const resultado2 = await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        user_metadata: {
          nome,
          telefone,
          endereco: endereco || null
        }
      })
      
      if (resultado2.error) {
        console.error('❌ ERRO na segunda tentativa:', resultado2.error)
        return NextResponse.json(
          { erro: `Erro ao criar usuário: ${resultado2.error.message || 'Erro desconhecido'}` },
          { status: 500 }
        )
      }
      
      authData = resultado2.data
      createAuthError = null
      console.log('✅ Usuário criado na segunda tentativa (sem email_confirm)')
    }

    // Se ainda houver erro, retorna
    if (createAuthError) {
      console.error('❌ ERRO ao criar no Auth:', createAuthError)
      console.error('   Mensagem:', createAuthError.message)
      console.error('   Status:', createAuthError.status)
      console.error('   Name:', createAuthError.name)
      
      if (createAuthError.message?.includes('already registered')) {
        return NextResponse.json(
          { erro: 'Este email já está cadastrado' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { erro: `Erro ao criar usuário: ${createAuthError.message || 'Verifique as configurações do Supabase'}` },
        { status: 500 }
      )
    }

    if (!authData?.user) {
      console.error('ERRO: Auth não retornou usuário')
      console.error('authData recebido:', authData)
      return NextResponse.json(
        { erro: 'Falha ao criar usuário no sistema de autenticação' },
        { status: 500 }
      )
    }

    console.log('7. Usuário criado no Auth:', authData.user.id)

    console.log('8. Inserindo na tabela usuarios...')
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
      console.error('ERRO ao inserir na tabela:', insertError.message)
      console.error('Detalhes do erro:', JSON.stringify(insertError, null, 2))
      
      console.log('9. Fazendo rollback (deletando do Auth)...')
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json(
        { erro: `Erro ao salvar dados: ${insertError.message}` },
        { status: 500 }
      )
    }

    console.log('10. Usuário salvo na tabela')

    console.log('11. Enviando email...')
    try {
      await enviarEmailBoasVindas(email, nome, senha)
      console.log('12. Email enviado com sucesso')
    } catch (emailError: any) {
      console.error('AVISO: Erro ao enviar email (não crítico):', emailError.message)
    }

    console.log('=== FIM POST /api/usuarios (SUCESSO) ===')

    return NextResponse.json({ 
      sucesso: true, 
      usuario: novoUsuario 
    }, { status: 201 })

  } catch (error: any) {
    console.error('=== ERRO GERAL NO POST ===')
    console.error('Mensagem:', error.message)
    console.error('Stack:', error.stack)
    console.error('===========================')
    return NextResponse.json(
      { erro: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}