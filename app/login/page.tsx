'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { useEffect } from 'react'

// Adicione dentro do componente, antes do return:
useEffect(() => {
  // Se já está logado, redireciona
  const token = localStorage.getItem('token')
  if (token) {
    router.push('/')
  }
}, [])

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      })

      const data = await res.json()

      if (!res.ok) {
        setErro(data.erro || 'Erro ao fazer login')
        setLoading(false)
        return
      }

      // Salvar no localStorage
      localStorage.setItem('token', data.token)
      localStorage.setItem('usuario', JSON.stringify(data.usuario))

      router.push('/')

    } catch (error) {
      setErro('Erro de conexão')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">
          CRM Comissões
        </h1>
        <p className="text-gray-400 text-center mb-8">Faça login para continuar</p>

        <form onSubmit={handleLogin} className="space-y-5">
          {erro && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-semibold py-3 rounded-lg transition"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>Usuário master padrão:</p>
          <p className="text-gray-400">master@crm.com / master123</p>
        </div>
      </div>
    </div>
  )
}