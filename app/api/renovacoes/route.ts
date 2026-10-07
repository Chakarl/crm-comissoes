import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

// GET /api/renovacoes
export async function GET() {
  const supabase = await getSupabase()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  let { data: usuario, error: usuarioError } = await supabase
    .from('usuarios')
    .select('id, is_master')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!usuario && !usuarioError) {
    const result = await supabase
      .from('usuarios')
      .select('id, is_master')
      .eq('id', user.id)
      .maybeSingle()
    usuario = result.data
    usuarioError = result.error
  }

  if (usuarioError) {
    console.error('Erro ao carregar perfil do usuário:', usuarioError)
    return NextResponse.json({ error: 'Erro ao verificar permissões.' }, { status: 500 })
  }

  if (!usuario) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 403 })
  }

  if (usuario.is_master) {
    const { data, error } = await supabase
      .from('vw_alertas_renovacao')
      .select('*')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data: propostas, error: propostasError } = await supabase
    .from('propostas')
    .select('id')
    .eq('usuario_id', usuario.id)

  if (propostasError) {
    return NextResponse.json({ error: propostasError.message }, { status: 500 })
  }

  if (!propostas?.length) return NextResponse.json([])

  const { data, error } = await supabase
    .from('vw_alertas_renovacao')
    .select('*')
    .in('proposta_id', propostas.map((proposta) => proposta.id))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}