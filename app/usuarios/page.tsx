import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
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

export async function POST(request: Request) {
  try {
    const { email, senha, nome, telefone, endereco, token } = await request.json()

    if (!email || !senha || !nome || !telefone || !token) {
      return NextResponse.json({ erro: 'Dados incompletos' }, { status: 400 })
    }

    // Valida token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
    }

    // Verifica se é master
    const { data: usuarioLogado } = await supabaseAdmin
      .from('usuarios')
      .select('is_master')
      .eq('id', user.id)
      .single()

    if (!usuarioLogado?.is_master) {
      return NextResponse.json({ erro: 'Apenas o master pode criar usuários' }, { status: 403 })
    }

    const senhaHash = await bcrypt.hash(senha, 10)

    // 1. Cria no Auth
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome }
    })

    if (createError) {
      if (createError.message.includes('already been registered')) {
        return NextResponse.json({ erro: 'Email já cadastrado' }, { status: 400 })
      }
      throw createError
    }

    // 2. Insere na tabela
    const { data, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authUser.user.id,
        email,
        senha_hash: senhaHash,
        nome,
        telefone,
        endereco: endereco || null,
        is_master: false,
        criado_por: user.id
      })
      .select()
      .single()

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      if (dbError.code === '23505') {
        return NextResponse.json({ erro: 'Email já cadastrado' }, { status: 400 })
      }
      throw dbError
    }

    // 3. Envia email (não bloqueia resposta)
    enviarEmailBoasVindas(email, nome, senha).catch(err => {
      console.error('❌ Erro ao enviar email:', err)
    })

    const { senha_hash, ...usuarioSeguro } = data
    return NextResponse.json(usuarioSeguro)

  } catch (error: any) {
    console.error('❌ Erro ao criar usuário:', error)
    return NextResponse.json({ erro: error.message || 'Erro no servidor' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ erro: 'Token não fornecido' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
    }

    const { data: usuarioLogado } = await supabaseAdmin
      .from('usuarios')
      .select('is_master')
      .eq('id', user.id)
      .single()

    if (!usuarioLogado?.is_master) {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
    }

    const { data: usuarios } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, nome, telefone, endereco, is_master, ativo, criado_em')
      .order('criado_em', { ascending: false })

    return NextResponse.json(usuarios || [])

  } catch (error: any) {
    console.error('❌ Erro ao listar usuários:', error)
    return NextResponse.json({ erro: error.message || 'Erro no servidor' }, { status: 500 })
  }
}