import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enviarEmailBoasVindas } from '@/lib/email'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  let authUserId: string | null = null

  try {
    const body = await request.json()
    const { email, senha, nome, telefone, endereco, token } = body

    if (
      typeof email !== 'string' ||
      typeof senha !== 'string' ||
      typeof nome !== 'string' ||
      typeof telefone !== 'string' ||
      typeof token !== 'string' ||
      !email.trim() ||
      !senha ||
      !nome.trim() ||
      !telefone.trim()
    ) {
      return NextResponse.json(
        { erro: 'Campos obrigatórios: email, senha, nome, telefone' },
        { status: 400 }
      )
    }

    const telefoneFormatado = telefone.replace(/\D/g, '')
    if (telefoneFormatado.length < 10 || telefoneFormatado.length > 11) {
      return NextResponse.json({ erro: 'Telefone inválido.' }, { status: 400 })
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { erro: 'Sessão inválida ou expirada' },
        { status: 401 }
      )
    }

    const { data: usuarioLogado, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .select('id, is_master, role')
      .eq('id', user.id)
      .maybeSingle()

    if (usuarioError) {
      console.error('Erro ao verificar permissões:', usuarioError)
      return NextResponse.json({ erro: 'Erro ao verificar permissões' }, { status: 500 })
    }

    if (!usuarioLogado || (!usuarioLogado.is_master && usuarioLogado.role !== 'supervisor')) {
      return NextResponse.json(
        { erro: 'Sem permissão para cadastrar usuários' },
        { status: 403 }
      )
    }

    const emailNormalizado = email.trim().toLowerCase()
    const { data: emailExiste, error: checkError } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', emailNormalizado)
      .maybeSingle()

    if (checkError) {
      console.error('Erro ao verificar email:', checkError)
      return NextResponse.json({ erro: 'Erro ao verificar email' }, { status: 500 })
    }

    if (emailExiste) {
      return NextResponse.json({ erro: 'Este e-mail já está cadastrado' }, { status: 409 })
    }

    const roleSolicitada = body.role
    if (usuarioLogado.is_master && roleSolicitada && !['promotor', 'supervisor'].includes(roleSolicitada)) {
      return NextResponse.json({ erro: 'Perfil de usuário inválido.' }, { status: 400 })
    }
    const roleFinal =
      usuarioLogado.is_master && roleSolicitada === 'supervisor'
        ? 'supervisor'
        : 'promotor'

    const senhaHash = await bcrypt.hash(senha, 10)
    const { data: authData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: emailNormalizado,
        password: senha,
        email_confirm: true,
        user_metadata: { nome: nome.trim() },
      })

    if (createError || !authData.user) {
      const duplicated =
        createError?.message.toLowerCase().includes('already') ||
        createError?.message.toLowerCase().includes('exists')
      return NextResponse.json(
        { erro: duplicated ? 'Este e-mail já está cadastrado no sistema de autenticação' : 'Erro ao criar usuário.' },
        { status: duplicated ? 409 : 500 }
      )
    }

    authUserId = authData.user.id

    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('id', authUserId)
      .maybeSingle()

    if (perfilError || !perfil) {
      throw new Error('O perfil do usuário não foi criado pelo sistema de autenticação.')
    }

    const { error: updateError } = await supabaseAdmin
      .from('usuarios')
      .update({
        auth_id: authUserId,
        email: emailNormalizado,
        nome: nome.trim(),
        telefone: telefoneFormatado,
        endereco: typeof endereco === 'string' && endereco.trim() ? endereco.trim() : null,
        senha_hash: senhaHash,
        role: roleFinal,
        is_master: false,
        ativo: true,
        criado_por: usuarioLogado.id,
      })
      .eq('id', authUserId)

    if (updateError) throw updateError

    let aviso: string | undefined
    try {
      await enviarEmailBoasVindas({
        email: emailNormalizado,
        nome: nome.trim(),
        senha,
        telefone: telefoneFormatado,
      })
    } catch (emailError) {
      console.error('Falha ao enviar email de boas-vindas:', emailError)
      aviso = 'Usuário criado, mas não foi possível enviar o email de boas-vindas.'
    }

    return NextResponse.json(
      {
        sucesso: true,
        ...(aviso ? { aviso } : {}),
        usuario: {
          id: authUserId,
          nome: nome.trim(),
          email: emailNormalizado,
          telefone: telefoneFormatado,
          endereco,
          role: roleFinal,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error)

    if (authUserId) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserId)
      if (deleteError) {
        console.error('Falha ao remover usuário após erro no cadastro:', deleteError)
      }
    }

    return NextResponse.json({ erro: 'Erro interno ao cadastrar usuário.' }, { status: 500 })
  }
}
