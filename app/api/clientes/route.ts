import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/clientes?q=João   — busca por nome ou CPF
// GET /api/clientes           — lista todos
export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()

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
      propostas(count)
    `)
    .order('nome', { ascending: true })

  if (q) {
    query = query.or(`nome.ilike.%${q}%,cpf.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/clientes — criar cliente
export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const body = await req.json()

  const { nome, cpf, telefone, agencia, conta } = body

  if (!nome) {
    return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  }

  // Verifica duplicidade de CPF
  if (cpf) {
    const { data: existing } = await supabase
      .from('clientes')
      .select('id')
      .eq('cpf', cpf)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'CPF já cadastrado.' }, { status: 409 })
    }
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert({ nome, cpf, telefone, agencia, conta })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}