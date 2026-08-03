import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const senhaHash = await bcrypt.hash('master123', 10)

    // Deletar master antigo (caso exista com hash errado)
    await supabase.from('usuarios').delete().eq('email', 'master@crm.com')

    // Recriar com hash correto
    const { data, error } = await supabase.from('usuarios').insert({
      email: 'master@crm.com',
      senha_hash: senhaHash,
      nome: 'Administrador Master',
      is_master: true,
      ativo: true
    }).select().single()

    if (error) throw error

    return NextResponse.json({ 
      sucesso: true, 
      mensagem: 'Usuário master criado com sucesso',
      email: 'karlmarxdepaula@gmail.com',
      senha: 'Karl192029'
    })

  } catch (error) {
    console.error('Erro ao criar master:', error)
    return NextResponse.json({ erro: String(error) }, { status: 500 })
  }
}