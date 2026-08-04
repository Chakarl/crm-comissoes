import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  const cookieStore = cookies()
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

// GET /api/clientes/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()

  const { data: cliente, error } = await supabase
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
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(cliente)
}

// PUT /api/clientes/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()
  const body = await req.json()

  const { nome, cpf, telefone, agencia, conta } = body

  if (!nome) {
    return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  }

  if (cpf) {
    const { data: existing } = await supabase
      .from('clientes')
      .select('id')
      .eq('cpf', cpf)
      .neq('id', params.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'CPF já cadastrado.' }, { status: 409 })
    }
  }

  const { data, error } = await supabase
    .from('clientes')
    .update({ nome, cpf, telefone, agencia, conta })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/clientes/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()

  const { count } = await supabase
    .from('propostas')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', params.id)

  if (count && count > 0) {
    return NextResponse.json(
      { error: 'Cliente possui propostas vinculadas e não pode ser excluído.' },
      { status: 409 }
    )
  }

  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}