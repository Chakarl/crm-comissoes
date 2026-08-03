import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { email, senha } = await request.json()

    if (!email || !senha) {
      return NextResponse.json({ erro: 'Email e senha obrigatórios' }, { status: 400 })
    }

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .eq('ativo', true)
      .single()

    if (error || !usuario) {
      return NextResponse.json({ erro: 'Credenciais inválidas' }, { status: 401 })
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash)
    if (!senhaValida) {
      return NextResponse.json({ erro: 'Credenciais inválidas' }, { status: 401 })
    }

    const token = crypto.randomUUID()
    const expiraEm = new Date()
    expiraEm.setHours(expiraEm.getHours() + 8)

    await supabase.from('sessoes').insert({
      usuario_id: usuario.id,
      token,
      expira_em: expiraEm.toISOString()
    })

    const { senha_hash, ...usuarioSeguro } = usuario

    // Criar resposta com cookie
    const response = NextResponse.json({ 
      usuario: usuarioSeguro,
      token 
    })

    // Salvar token em cookie HTTP-only
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 horas
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json({ erro: 'Erro no servidor' }, { status: 500 })
  }
}