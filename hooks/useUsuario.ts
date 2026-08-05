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
      // 1) Tenta Supabase Auth primeiro
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data } = await supabase
          .from('usuarios')
          .select('id, is_master')
          .eq('auth_id', user.id)
          .maybeSingle()

        if (data) {
          setUsuario(data)
          setLoading(false)
          return
        }
      }

      // 2) Fallback: localStorage (login legado)
      try {
        const stored = localStorage.getItem('usuario')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed?.id) {
            const { data } = await supabase
              .from('usuarios')
              .select('id, is_master')
              .eq('id', parsed.id)
              .maybeSingle()

            if (data) {
              setUsuario(data)
              setLoading(false)
              return
            }
          }
        }
      } catch {
        // localStorage indisponível ou JSON inválido
      }

      setLoading(false)
    }

    load()
  }, [])

  return { usuario, loading }
}