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
      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('usuarios')
        .select('id, is_master')
        .eq('auth_id', user.id)
        .maybeSingle()

      if (data) setUsuario(data)
      setLoading(false)
    }
    load()
  }, [])

  return { usuario, loading }
}