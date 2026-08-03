'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Usuario = {
  id: string
  email: string
  nome: string
  is_master: boolean
  ativo: boolean
  criado_em: string
}

export default function GerenciarUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [usuarioAtual, setUsuarioAtual] = useState<any>(null)
  const router = useRouter()

  const [form, setForm] = useState({
    email: '',
    senha: '',
    nome: ''
  })

  useEffect(() => {
    const user = localStorage.getItem('usuario')
    if (!user) {
      router.push('/login')
      return
    }

    const usuario = JSON.parse(user)
    setUsuarioAtual(usuario)

    if (!usuario.is_master) {
      alert('Acesso negado. Apenas master pode gerenciar usuários.')
      router.push('/')
      return
    }

    carregarUsuarios()
  }, [])

  async function carregarUsuarios() {
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/usuarios?token=${token}`)
    const data = await res.json()
    
    if (res.ok) {
      setUsuarios(data)
    }
    setLoading(false)
  }

  async function criarUsuario(e: React.FormEvent) {
    e.preventDefault()
    const token = localStorage.getItem('token')

    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, token })
    })

    const data = await res.json()

    if (res.ok) {
      alert('Usuário criado com sucesso!')
      setForm({ email: '', senha: '', nome: '' })
      setMostrarForm(false)
      carregarUsuarios()
    } else {
      alert(data.erro || 'Erro ao criar usuário')
    }
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    const token = localStorage.getItem('token')
    
    const res = await fetch('/api/usuarios/toggle', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ativo: !ativo, token })
    })

    if (res.ok) {
      carregarUsuarios()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white text-xl">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <header className="bg-gray-900 rounded-xl p-4 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Usuários</h1>
          <p className="text-gray-400 text-sm">Logado como: {usuarioAtual?.nome}</p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
        >
          ← Voltar
        </button>
      </header>

      <div className="mb-6">
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-semibold transition"
        >
          {mostrarForm ? 'Cancelar' : '+ Novo Usuário'}
        </button>
      </div>

      {mostrarForm && (
        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Criar Novo Usuário</h2>
          <form onSubmit={criarUsuario} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nome Completo</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Senha</label>
              <input
                type="password"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                minLength={6}
                required
              />
              <p className="text-xs text-gray-400 mt-1">Mínimo 6 caracteres</p>
            </div>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg font-semibold transition"
            >
              Criar Usuário
            </button>
          </form>
        </div>
      )}

      <div className="bg-gray-900 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left p-4">Nome</th>
                <th className="text-left p-4">Email</th>
                <th className="text-center p-4">Tipo</th>
                <th className="text-center p-4">Status</th>
                <th className="text-center p-4">Criado em</th>
                <th className="text-center p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((user) => (
                <tr key={user.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                  <td className="p-4">{user.nome}</td>
                  <td className="p-4 text-gray-400">{user.email}</td>
                  <td className="p-4 text-center">
                    {user.is_master ? (
                      <span className="bg-yellow-600 px-3 py-1 rounded-full text-xs font-bold">
                        MASTER
                      </span>
                    ) : (
                      <span className="bg-gray-700 px-3 py-1 rounded-full text-xs">
                        Usuário
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {user.ativo ? (
                      <span className="text-green-400">● Ativo</span>
                    ) : (
                      <span className="text-red-400">● Inativo</span>
                    )}
                  </td>
                  <td className="p-4 text-center text-gray-400 text-sm">
                    {new Date(user.criado_em).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4 text-center">
                    {!user.is_master && (
                      <button
                        onClick={() => toggleAtivo(user.id, user.ativo)}
                        className={`px-4 py-1 rounded-lg text-sm font-medium transition ${
                          user.ativo
                            ? 'bg-red-600 hover:bg-red-500'
                            : 'bg-green-600 hover:bg-green-500'
                        }`}
                      >
                        {user.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}