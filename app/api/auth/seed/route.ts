import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const senhaHash = await bcrypt.hash('Karl192029', 10)

    // Ver o que existe na tabela
    const { data: existentes, error: erroSelect } = await supabase
      .from('usuarios')
      .select('*')

    if (erroSelect) {
      return NextResponse.json({ 
        etapa: 'SELECT falhou',
        erro: erroSelect.message,
        detalhes: erroSelect
      }, { status: 500 })
    }

    // Deletar master antigo
    const { error: erroDelete } = await supabase
      .from('usuarios')
      .delete()
      .eq('email', 'karlmarxdepaula@gmail.com')

    if (erroDelete) {
      return NextResponse.json({ 
        etapa: 'DELETE falhou',
        erro: erroDelete.message,
        detalhes: erroDelete
      }, { status: 500 })
    }

    // Inserir novo master
    const { data, error: erroInsert } = await supabase
      .from('usuarios')
      .insert({
        email: 'karlmarxdepaula@gmail.com',
        senha_hash: senhaHash,
        nome: 'Administrador Master',
        is_master: true,
        ativo: true
      })
      .select()
      .single()

    if (erroInsert) {
      return NextResponse.json({ 
        etapa: 'INSERT falhou',
        erro: erroInsert.message,
        detalhes: erroInsert,
        // Mostra as colunas que existem na tabela
        usuariosExistentes: existentes
      }, { status: 500 })
    }

    return NextResponse.json({ 
      sucesso: true,
      usuario: data
    })

  } catch (error) {
    return NextResponse.json({ 
      etapa: 'EXCEPTION',
      erro: String(error)
    }, { status: 500 })
  }
}