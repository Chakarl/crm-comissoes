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

    // Valida campos obrigatórios
    if (!email || !senha || !nome || !telefone) {
      return NextResponse.json(
        { erro: 'Campos obrigatórios: email, senha, nome, telefone' },
        { status: 400 }
      )
    }

    // Valida token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { erro: 'Sessão inválida ou expirada. Faça login novamente.' },
        { status: 401 }
      )
    }

    // Verifica se é master
    const { data: usuarioLogado, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .select('is_master')
      .eq('id', user.id)
      .single()

    if (usuarioError) {
      console.error('Erro ao verificar master:', usuarioError)
      return NextResponse.json(
        { erro: 'Erro ao verificar permissões. Tente novamente.' },
        { status: 500 }
      )
    }

    if (!usuarioLogado?.is_master) {
      return NextResponse.json(
        { erro: 'Apenas usuários master podem cadastrar novos usuários.' },
        { status: 403 }
      )
    }

    console.log('📝 Iniciando cadastro:', { email, nome })

    // Verifica se email já existe
    const { data: emailExiste } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single()

    if (emailExiste) {
      return NextResponse.json(
        { erro: 'Este e-mail já está cadastrado no sistema.' },
        { status: 400 }
      )
    }

    console.log('✅ Email disponível, criando usuário no Auth...')

    // Cria usuário no Auth com email confirmado
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true, // Confirma email automaticamente
      user_metadata: { nome }
    })

    if (createAuthError) {
      console.error('❌ Erro ao criar no Auth:', createAuthError)
      
      // Tratamento de erros específicos
      if (createAuthError.message?.toLowerCase().includes('already')) {
        return NextResponse.json(
          { erro: 'Este e-mail já está cadastrado.' },
          { status: 400 }
        )
      }