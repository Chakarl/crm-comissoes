'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Usuario {
  id: string
  is_master: boolean
}

export function useUsuario() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      console.log('AUTH USER:', user)

      if (!user) {
        console.log('SEM AUTH USER')
        setLoading(false)
        return
      }

      // Tenta por auth_id
      let { data, error } = await supabase
        .from('usuarios')
        .select('id, is_master')
        .eq('auth_id', user.id)
        .maybeSingle()

      console.log('BUSCA POR auth_id:', data, error)

      // Se não achou por auth_id, tenta por email
      if (!data && user.email) {
        const result = await supabase
          .from('usuarios')
          .select('id, is_master')
          .eq('email', user.email)
          .maybeSingle()

        data = result.data
        error = result.error
        console.log('BUSCA POR email:', data, error)

        // Se achou por email, atualiza o auth_id pra próxima vez
        if (data) {
          await supabase
            .from('usuarios')
            .update({ auth_id: user.id })
            .eq('id', data.id)

          console.log('auth_id atualizado para o usuario', data.id)
        }
      }

      if (data) {
        setUsuario(data)
      } else {
        console.log('USUARIO NAO ENCONTRADO NA TABELA')
      }

      setLoading(false)
    }

    load()
  }, [])

  return { usuario, loading }
}