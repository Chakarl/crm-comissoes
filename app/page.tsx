import { Dashboard } from "@/components/Dashboard";

export default function HomePage() {
  'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null)
  const [token, setToken] = useState<string>('')

  // Verificar autenticação
  useEffect(() => {
    const tokenLocal = localStorage.getItem('token')
    const usuarioLocal = localStorage.getItem('usuario')

    if (!tokenLocal || !usuarioLocal) {
      router.push('/login')
      return
    }

    setToken(tokenLocal)
    setUsuarioLogado(JSON.parse(usuarioLocal))
  }, [router])

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    router.push('/login')
  }

  if (!usuarioLogado) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Carregando...</div>
  }

  const [usuarioLogado, setUsuarioLogado] = useState<any>(null)

useEffect(() => {
  // Verificar se está logado
  const token = localStorage.getItem('token')
  const usuario = localStorage.getItem('usuario')
  
  if (!token || !usuario) {
    window.location.href = '/login'
    return
  }
  
  setUsuarioLogado(JSON.parse(usuario))
}, [])

async function handleLogout() {
  const token = localStorage.getItem('token')
  
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  })
  
  localStorage.removeItem('token')
  localStorage.removeItem('usuario')
  window.location.href = '/login'
}
  // ... resto do código

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📊 Dashboard</h1>
      <Dashboard />
    </div>
  );
}