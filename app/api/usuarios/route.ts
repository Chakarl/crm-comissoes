import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarEmailBoasVindas } from '@/lib/email'
import bcrypt from 'bcryptjs'

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

function formatarTelefone(tel: string): string {
  const digitos = tel.replace(/\D/g, '')

  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  }

  return tel
}

async function criarUsuarioViaAPI(
  email: string,
  senha: string,
  nome: string,
  telefone: string,
  endereco: string | null,
  senhaHash: string,
  criadoPor: string
) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`

  console.log('🔵 Criando usuário via API REST:', email)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!
    },
    body: JSON.stringify({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome,
        telefone,
        endereco: endereco || '',
        senha_hash: senhaHash,
        criado_por: criadoPor
      }
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error('❌ Erro na API REST:', errorData)
    throw new Error(errorData.msg || errorData.message || 'Erro ao criar usuário')
  }

  const data = await response.json()
  console.log('✅ Usuário criado no Auth:', data.id)
  return data
}

async function deletarUsuarioAuth(userId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!
        }
      }
    )

    if (response.ok) {
      console.log('🗑️ Usuário deletado do Auth:', userId)
    } else {
      console.warn('⚠️ Falha ao deletar do Auth:', await response.text())
    }
  } catch (error) {
    console.error('❌ Erro ao deletar do Auth:', error)
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

    return NextResponse.json(usuarios || [])
  } catch (error: any) {
    console.error('Erro no GET /api/usuarios:', error)
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let authUserId: string | null = null

  try {
    const body = await request.json()
    const { email, senha, nome, telefone, endereco, token } = body

    if (!email || !senha || !nome || !telefone) {
      return NextResponse.json(
        { erro: 'Campos obrigatórios: email, senha, nome, telefone' },
        { status: 400 }
      )
    }

    // Formata o telefone antes de qualquer uso
    const telefoneFormatado = formatarTelefone(telefone)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { erro: 'Sessão inválida ou expirada' },
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
        { erro: 'Erro ao verificar permissões' },
        { status: 500 }
      )
    }

    if (!usuarioLogado?.is_master) {
      return NextResponse.json(
        { erro: 'Apenas usuários master podem cadastrar' },
        { status: 403 }
      )
    }

    console.log('📝 Iniciando cadastro:', email)

    // 1. Verifica se email já existe na tabela
    const { data: emailExiste, error: checkError } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (checkError) {
      console.error('Erro ao verificar email:', checkError)
      return NextResponse.json(
        { erro: 'Erro ao verificar email' },
        { status: 500 }
      )
    }

    if (emailExiste) {
      console.log('❌ Email já cadastrado:', email)
      return NextResponse.json(
        { erro: 'Este e-mail já está cadastrado' },
        { status: 400 }
      )
    }

    // 2. Gera hash da senha
    const senhaHash = await bcrypt.hash(senha, 10)
    console.log('🔒 Senha hashada gerada')

    // 3. Cria usuário no Auth (o trigger handle_new_user faz o INSERT na tabela)
    let authData
    try {
      authData = await criarUsuarioViaAPI(
        email,
        senha,
        nome,
        telefoneFormatado,
        endereco,
        senhaHash,
        user.id
      )
    } catch (error: any) {
      console.error('❌ Erro ao criar no Auth:', error)

      if (
        error.message?.toLowerCase().includes('already') ||
        error.message?.toLowerCase().includes('exists')
      ) {
        return NextResponse.json(
          { erro: 'Este e-mail já está cadastrado no sistema de autenticação' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { erro: `Erro ao criar usuário: ${error.message}` },
        { status: 500 }
      )
    }

    if (!authData?.id) {
      return NextResponse.json(
        { erro: 'Falha ao criar usuário no Auth' },
        { status: 500 }
      )
    }

    authUserId = authData.id

    // 4. Aguarda o trigger popular a tabela e verifica
    await new Promise(resolve => setTimeout(resolve, 1500))

    const { data: novoUsuario, error: verificaError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', authUserId)
      .single()

    if (verificaError || !novoUsuario) {
      console.error('❌ Trigger não criou o registro:', verificaError)
      await deletarUsuarioAuth(authUserId)
      return NextResponse.json(
        { erro: 'Erro ao salvar dados do usuário' },
        { status: 500 }
      )
    }

    // 5. Verifica se os campos foram populados corretamente, senão atualiza
    if (!novoUsuario.nome || !novoUsuario.senha_hash) {
      console.error('⚠️ Registro incompleto, atualizando manualmente...')

      const { data: atualizado, error: updateError } = await supabaseAdmin
        .from('usuarios')
        .update({
          nome: nome,
          telefone: telefoneFormatado,
          endereco: endereco || null,
          senha_hash: senhaHash,
          is_master: false,
          ativo: true,
          criado_por: user.id
        })
        .eq('id', authUserId)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Falha ao atualizar registro:', updateError)
        await deletarUsuarioAuth(authUserId)
        await supabaseAdmin.from('usuarios').delete().eq('id', authUserId)
        return NextResponse.json(
          { erro: 'Erro ao completar cadastro do usuário' },
          { status: 500 }
        )
      }

      console.log('✅ Registro atualizado com sucesso:', atualizado.id)
    }

    // 6. Envia email de boas-vindas
    try {
      await enviarEmailBoasVindas({
        email,
        nome,
        senha,
        telefone: telefoneFormatado
      })
      console.log('📧 Email de boas-vindas enviado para:', email)
    } catch (emailError: any) {
      console.error('⚠️ Falha ao enviar email (cadastro mantido):', emailError.message)
    }

    // 7. Retorna sucesso
    return NextResponse.json({
      sucesso: true,
      mensagem: 'Usuário cadastrado com sucesso',
      usuario: {
        id: authUserId,
        email,
        nome,
        telefone: telefoneFormatado,
        endereco: endereco || null
      }
    })

  } catch (error: any) {
    console.error('❌ Erro geral no POST /api/usuarios:', error)

    if (authUserId) {
      await deletarUsuarioAuth(authUserId)
      await supabaseAdmin.from('usuarios').delete().eq('id', authUserId)
    }

    return NextResponse.json(
      { erro: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}