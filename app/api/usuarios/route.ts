import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarEmailBoasVindas } from '@/lib/email'

// Valida variáveis de ambiente
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada')
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
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

// Função auxiliar com retry
async function criarUsuarioComRetry(email: string, senha: string, nome: string, tentativas = 3) {
  for (let i = 0; i < tentativas; i++) {
    try {
      console.log(`Tentativa ${i + 1}/${tentativas} de criar usuário: ${email}`)
      
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome }
      })

      if (error) {
        console.error(`Erro na tentativa ${i + 1}:`, {
          message: error.message,
          status: error.status,
          code: error.code || 'sem código'
        })
        
        // Se for erro de duplicação, não tenta novamente
        if (error.message?.toLowerCase().includes('already') || 
            error.message?.toLowerCase().includes('exists')) {
          throw error
        }
        
        // Se não for a última tentativa, aguarda antes de tentar novamente
        if (i < tentativas - 1) {
          console.log(`Aguardando 2s antes da próxima tentativa...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }
        
        throw error
      }

      console.log(`✅ Usuário criado com sucesso na tentativa ${i + 1}`)
      return data

    } catch (error: any) {
      if (i === tentativas - 1) {
        throw error
      }
    }
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

    console.log('📝 Iniciando cadastro de:', email)

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

    // Usa função com retry
    const authData = await criarUsuarioComRetry(email, senha, nome)

    if (!authData?.user) {
      return NextResponse.json(
        { erro: 'Falha ao criar usuário no Auth' },
        { status: 500 }
      )
    }

    console.log('✅ Usuário criado no Auth:', authData.user.id)

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
      console.error('❌ Erro ao inserir na tabela:', insertError)
      
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        console.log('Usuário revertido do Auth')
      } catch (deleteError) {
        console.error('Erro ao reverter:', deleteError)
      }
      
      return NextResponse.json(
        { erro: 'Erro ao salvar dados: ' + insertError.message },
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
      { erro: error.message || 'Erro ao criar usuário. Verifique as configurações do Supabase.' },
      { status: 500 }
    )
  }
}