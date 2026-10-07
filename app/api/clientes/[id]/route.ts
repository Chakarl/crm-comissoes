import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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

async function getUsuario(supabase: Awaited<ReturnType<typeof getSupabase>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return null

  let { data: usuario, error } = await supabase
    .from('usuarios')
    .select('id, is_master')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!usuario && !error) {
    const result = await supabase
      .from('usuarios')
      .select('id, is_master')
      .eq('id', user.id)
      .maybeSingle()
    usuario = result.data
    error = result.error
  }

  if (error) {
    console.error('Erro ao carregar perfil do usuário:', error)
    return null
  }

  return usuario
}

// GET /api/clientes/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabase()
  const { id } = await params
  const usuario = await getUsuario(supabase)

  if (!usuario) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  let query = supabase
    .from('clientes')
    .select(`
      id,
      nome,
      cpf,
      telefone,
      agencia,
      conta,
      created_at,
      propostas (
        id,
        numero_proposta,
        tipo_proposta_codigo,
        data_proposta,
        valor_proposta,
        prazo_meses,
        status
      )
    `)
    .eq('id', id)

  if (!usuario.is_master) query = query.eq('usuario_id', usuario.id)
  const { data: cliente, error } = await query.maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  return NextResponse.json(cliente)
}

// PUT /api/clientes/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabase()
  const { id } = await params
  const usuario = await getUsuario(supabase)

  if (!usuario) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const body = await req.json()

  const { nome, cpf, telefone, agencia, conta } = body

  if (!nome) {
    return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  }

  if (cpf) {
    let duplicateQuery = supabase
      .from('clientes')
      .select('id')
      .eq('cpf', cpf)
      .neq('id', id)
    if (!usuario.is_master) {
      duplicateQuery = duplicateQuery.eq('usuario_id', usuario.id)
    }
    const { data: existing, error: duplicateError } = await duplicateQuery.maybeSingle()

    if (duplicateError) {
      return NextResponse.json({ error: duplicateError.message }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json({ error: 'CPF já cadastrado.' }, { status: 409 })
    }
  }

  let updateQuery = supabase
    .from('clientes')
    .update({ nome, cpf, telefone, agencia, conta })
    .eq('id', id)
  if (!usuario.is_master) updateQuery = updateQuery.eq('usuario_id', usuario.id)
  const { data, error } = await updateQuery.select().maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  return NextResponse.json(data)
}

// DELETE /api/clientes/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabase()
  const { id } = await params
  const usuario = await getUsuario(supabase)

  if (!usuario) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  let countQuery = supabase
    .from('propostas')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', id)
  if (!usuario.is_master) countQuery = countQuery.eq('usuario_id', usuario.id)
  const { count, error: countError } = await countQuery

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 })
  }

  if (count && count > 0) {
    return NextResponse.json(
      { error: 'Cliente possui propostas vinculadas e não pode ser excluído.' },
      { status: 409 }
    )
  }

  let deleteQuery = supabase
    .from('clientes')
    .delete()
    .eq('id', id)
  if (!usuario.is_master) deleteQuery = deleteQuery.eq('usuario_id', usuario.id)
  const { error } = await deleteQuery

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}