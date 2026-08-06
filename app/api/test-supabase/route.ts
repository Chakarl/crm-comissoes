import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const diagnostico: any = {
    timestamp: new Date().toISOString(),
    variaveis: {},
    testes: {}
  }

  try {
    // 1. Verificar variáveis de ambiente
    diagnostico.variaveis = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ OK' : '❌ FALTANDO',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ OK' : '❌ FALTANDO',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ OK' : '❌ FALTANDO',
      URL_primeiros_20: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) || 'N/A',
      ANON_primeiros_20: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) || 'N/A',
      SERVICE_primeiros_20: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) || 'N/A',
    }

    // 2. Testar cliente Admin
    try {
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

      diagnostico.testes.cliente_admin = '✅ Criado'

      // 3. Testar busca na tabela usuarios
      const { data, error } = await supabaseAdmin
        .from('usuarios')
        .select('id, email, nome')
        .limit(1)

      if (error) {
        diagnostico.testes.busca_usuarios = `❌ ERRO: ${error.message}`
        diagnostico.testes.erro_detalhes = error
      } else {
        diagnostico.testes.busca_usuarios = `✅ Sucesso (${data?.length || 0} registros)`
        diagnostico.testes.primeiro_usuario = data?.[0] || 'Nenhum usuário encontrado'
      }

      // 4. Testar Admin Auth
      try {
        const { data: users, error: authError } = await supabaseAdmin.auth.admin.listUsers()
        
        if (authError) {
          diagnostico.testes.admin_auth = `❌ ERRO: ${authError.message}`
        } else {
          diagnostico.testes.admin_auth = `✅ Sucesso (${users?.users?.length || 0} usuários no Auth)`
        }
      } catch (authErr: any) {
        diagnostico.testes.admin_auth = `❌ EXCEÇÃO: ${authErr.message}`
      }

    } catch (clientErr: any) {
      diagnostico.testes.cliente_admin = `❌ ERRO: ${clientErr.message}`
    }

    return NextResponse.json(diagnostico, { status: 200 })

  } catch (error: any) {
    diagnostico.erro_geral = error.message
    diagnostico.stack = error.stack
    return NextResponse.json(diagnostico, { status: 500 })
  }
}