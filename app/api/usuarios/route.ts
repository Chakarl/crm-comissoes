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

async function criarUsuarioViaAPI(email: string, senha: string, nome: string) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`
  
  console.log('Criando usuário via API REST:', email)
  
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
      user_metadata: { nome }
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error('Erro na API REST:', errorData)
    throw new Error(errorData.msg || errorData.message || 'Erro ao criar usuário')
  }

  const data = await response.json()
  console.log('✅ Resposta da API:', data)
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
      console.log('✅ Usuário deletado do Auth:', userId)
    } else {
      console.warn('⚠️ Falha ao deletar do Auth:', await response.text())
    }
  } catch (error) {
    console.error('❌ Erro ao deletar do Auth:', error)
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
    const { data: emailExiste } = await supabaseAdmin
      .from('usuarios')
      .select('id, email')
      .eq('email', email)
      .single()

    if (emailExiste) {
      return NextResponse.json(
        { erro: 'Este e-mail já está cadastrado' },
        { status: 400 }
      )
    }

    // 2. Gera hash da senha
    const senhaHash = await bcrypt.hash(senha, 10)
    console.log('Senha hashada gerada')

    // 3. Cria usuário no Auth
    let authData
    try {
      authData = await criarUsuarioViaAPI(email, senha, nome)
    } catch (error: any) {
      console.error('❌ Erro ao criar no Auth:', error)
      
      if (error.message?.toLowerCase().includes('already') || 
          error.message?.toLowerCase().includes('exists')) {
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
    console.log('✅ Usuário criado no Auth:', authUserId)

    // 4. VERIFICAÇÃO ADICIONAL: Checa se esse ID já existe na tabela
    const { data: idExiste } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('id', authUserId)
      .single()

    if (idExiste) {
      console.error('❌ ID já existe na tabela! Deletando do Auth e abortando')
      await deletarUsuarioAuth(authUserId)
      
      return NextResponse.json(
        { erro: 'Conflito de ID detectado. Por favor, tente novamente.' },
        { status: 409 }
      )
    }

    // 5. Insere na tabela usuarios
    const { data: novoUsuario, error: insertError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authUserId,
        email: email,
        nome: nome,
        telefone: telefone,
        endereco: endereco || null,
        senha_hash: senhaHash,
        is_master: false,
        ativo: true
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Erro ao inserir na tabela:', insertError)
      
      // REVERTE: deleta do Auth
      await deletarUsuarioAuth(authUserId)
      
      return NextResponse.json(
        { erro: `Erro ao salvar dados: ${insertError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Usuário salvo na tabela:', novoUsuario)

    // 6. Envia email
    try {
      await enviarEmailBoasVindas(email, nome, senha)
      console.log('✅ Email enviado')
    } catch (emailError: any) {
      console.warn('⚠️ Email não enviado:', emailError.message)
    }

    return NextResponse.json({ 
      sucesso: true, 
      usuario: novoUsuario 
    }, { status: 201 })

  } catch (error: any) {
    console.error('❌ Erro no POST /api/usuarios:', error)
    
    // Se criou no Auth mas falhou depois, tenta reverter
    if (authUserId) {
      await deletarUsuarioAuth(authUserId)
    }
    
    return NextResponse.json(
      { erro: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}