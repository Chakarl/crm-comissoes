'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      router.push('/')
    }
  }, [router])

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
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
              placeholder="seu@email.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-semibold py-3 rounded-lg transition"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-800 text-center text-sm text-gray-400">
          <p>Credenciais padrão:</p>
          <p className="font-mono mt-1">master@crm.com / master123</p>
        </div>
      </div>
    </div>
  )
}