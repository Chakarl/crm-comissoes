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

    const { data: emailExiste } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single()

    if (emailExiste) {
      return NextResponse.json(
        { erro: 'Este e-mail já está cadastrado' },
        { status: 400 }
      )
    }

    // Gera hash da senha
    const senhaHash = await bcrypt.hash(senha, 10)
    console.log('Senha hashada gerada')

    let authData
    try {
      authData = await criarUsuarioViaAPI(email, senha, nome)
    } catch (error: any) {
      console.error('❌ Erro ao criar no Auth:', error)
      
      if (error.message?.toLowerCase().includes('already') || 
          error.message?.toLowerCase().includes('exists')) {
        return NextResponse.json(
          { erro: 'Este e-mail já está cadastrado no sistema' },
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

    console.log('✅ Usuário criado no Auth:', authData.id)

    // Insere na tabela usuarios COM senha_hash
    const { data: novoUsuario, error: insertError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authData.id,
        email,
        nome,
        telefone,
        endereco: endereco || null,
        senha_hash: senhaHash, // ADICIONA O HASH
        is_master: false,
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Erro ao inserir na tabela:', insertError)
      
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${authData.id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!
            }
          }
        )
        console.log('Usuário revertido do Auth')
      } catch (deleteError) {
        console.error('Erro ao reverter:', deleteError)
      }
      
      return NextResponse.json(
        { erro: `Erro ao salvar dados: ${insertError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Usuário salvo na tabela')

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
    return NextResponse.json(
      { erro: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}