import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { email, senha, nome, token } = await request.json()

    if (!email || !senha || !nome || !token) {
      return NextResponse.json({ erro: 'Dados incompletos' }, { status: 400 })
    }

    const { data: sessao } = await supabaseAdmin
      .from('sessoes')
      .select('usuario_id')
      .eq('token', token)
      .gte('expira_em', new Date().toISOString())
      .single()

    if (!sessao) {
      return NextResponse.json({ erro: 'Sessão inválida' }, { status: 401 })
    }

    const { data: criador } = await supabaseAdmin
      .from('usuarios')
      .select('is_master')
      .eq('id', sessao.usuario_id)
      .single()

    if (!criador?.is_master) {
      return NextResponse.json({ erro: 'Apenas o master pode criar usuários' }, { status: 403 })
    }

    const senhaHash = await bcrypt.hash(senha, 10)

    // 1. Cria o usuário no Auth do Supabase
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ erro: 'Email já cadastrado' }, { status: 400 })
      }
      throw authError
    }

    // 2. Insere na tabela usuarios usando o MESMO ID do Auth
    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authUser.user.id,
        email,
        senha_hash: senhaHash,
        nome,
        is_master: false,
        criado_por: sessao.usuario_id
      })
      .select()
      .single()

    if (error) {
      // Se falhar o insert, remove o usuário do Auth pra não ficar órfão
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)

      if (error.code === '23505') {
        return NextResponse.json({ erro: 'Email já cadastrado' }, { status: 400 })
      }
      throw error
    }

    const { senha_hash, ...usuarioSeguro } = data
    return NextResponse.json(usuarioSeguro)

  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json({ erro: 'Erro no servidor' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ erro: 'Token não fornecido' }, { status: 401 })
    }

    const { data: sessao } = await supabaseAdmin
      .from('sessoes')
      .select('usuario_id')
      .eq('token', token)
      .gte('expira_em', new Date().toISOString())
      .single()

    if (!sessao) {
      return NextResponse.json({ erro: 'Sessão inválida' }, { status: 401 })
    }

    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('is_master')
      .eq('id', sessao.usuario_id)
      .single()

    if (!usuario?.is_master) {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
    }

    const { data: usuarios } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, nome, telefone, endereco, is_master, ativo, criado_em')
      .order('criado_em', { ascending: false })

    return NextResponse.json(usuarios || [])

  } catch (error) {
    console.error('Erro ao listar usuários:', error)
    return NextResponse.json({ erro: 'Erro no servidor' }, { status: 500 })
  }
}