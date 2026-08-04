'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const supabase = createClient()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Usuários</h1>
      <p className="text-slate-600">Em desenvolvimento</p>
    </div>
  )
}