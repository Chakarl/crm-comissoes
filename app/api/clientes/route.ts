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

async function getUsuario(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, is_master')
    .eq('auth_id', user.id)
    .maybeSingle()

  return usuario
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase()
  const usuario = await getUsuario(supabase)

  if (!usuario) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()

  let query = supabase
    .from('clientes')
    .select(
      `
      id,
      nome,
      cpf,
      telefone,
      agencia,
      conta,
      created_at,
      usuario_id,
      propostas(count)
    `
    )
    .order('nome', { ascending: true })

  if (!usuario.is_master) {
    query = query.eq('usuario_id', usuario.id)
  }

  if (q) {
    query = query.or(`nome.ilike.%${q}%,cpf.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
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
    .insert({
      nome,
      cpf,
      telefone,
      agencia,
      conta,
      usuario_id: usuario.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}