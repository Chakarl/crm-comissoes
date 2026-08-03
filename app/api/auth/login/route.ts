import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { email, senha } = await request.json()

    if (!email || !senha) {
      return NextResponse.json({ erro: 'Email e senha obrigatórios' }, { status: 400 })
    }

    // Buscar usuário
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .eq('ativo', true)
      .single()

    if (error || !usuario) {
      return NextResponse.json({ erro: 'Credenciais inválidas' }, { status: 401 })
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash)
    if (!senhaValida) {
      return NextResponse.json({ erro: 'Credenciais inválidas' }, { status: 401 })
    }

    // Criar sessão (token simples - em produção use JWT)
    const token = crypto.randomUUID()
    const expiraEm = new Date()
    expiraEm.setHours(expiraEm.getHours() + 8) // 8h de sessão

    await supabase.from('sessoes').insert({
      usuario_id: usuario.id,
      token,
      expira_em: expiraEm.toISOString()
    })

    // Retornar dados sem senha
    const { senha_hash, ...usuarioSeguro } = usuario

    return NextResponse.json({ 
      usuario: usuarioSeguro,
      token 
    })

  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json({ erro: 'Erro no servidor' }, { status: 500 })
  }
}