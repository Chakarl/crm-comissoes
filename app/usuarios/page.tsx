'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Usuario = {
  id: number
  email: string
  nome: string
  telefone?: string
  endereco?: string
  is_master: boolean
  ativo: boolean
  criado_em: string
}

const FORM_VAZIO = {
  nome: '',
  email: '',
  senha: '',
  telefone: '',
  endereco: '',
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const router = useRouter()

  function getToken() {
    return localStorage.getItem('token') || ''
  }

  async function carregarUsuarios() {
    const token = getToken()
    const res = await fetch(`/api/usuarios?token=${token}`)
    if (res.status === 401 || res.status === 403) {
      router.push('/')
      return
    }
    const data = await res.json()
    setUsuarios(data)
    setLoading(false)
  }

  useEffect(() => {
    const user = localStorage.getItem('usuario')
    if (!user) { router.push('/login'); return }
    const u = JSON.parse(user)
    if (!u.is_master) { router.push('/'); return }
    carregarUsuarios()
  }, [])

  async function criarUsuario(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, token: getToken() }),
    })

    const data = await res.json()
    setSalvando(false)

    if (!res.ok) {
      setErro(data.erro || 'Erro ao criar usuário')
      return
    }

    setForm(FORM_VAZIO)
    await carregarUsuarios()
  }

  async function toggleAtivo(id: number, ativo: boolean) {
    const res = await fetch('/api/usuarios/toggle', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ativo: !ativo, token: getToken() }),
    })
    if (res.ok) await carregarUsuarios()
  }

  function campo(label: string) {
    return 'bg-gray-800 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full'
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Gerenciar Usuários</h1>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            ← Voltar
          </button>
        </div>

        {/* Formulário */}
        <div className="bg-gray-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Novo Usuário</h2>
          <form onSubmit={criarUsuario} className="space-y-4">

            {/* Linha 1 — obrigatórios */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">
                  Nome <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  required
                  className={campo('')}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">
                  E-mail <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                  className={campo('')}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">
                  Senha <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Senha"
                  value={form.senha}
                  onChange={e => setForm({ ...form, senha: e.target.value })}
                  required
                  className={campo('')}
                />
              </div>
            </div>

            {/* Linha 2 — opcionais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Telefone</label>
                <input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={form.telefone}
                  onChange={e => setForm({ ...form, telefone: e.target.value })}
                  className={campo('')}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Endereço</label>
                <input
                  type="text"
                  placeholder="Rua, número, cidade..."
                  value={form.endereco}
                  onChange={e => setForm({ ...form, endereco: e.target.value })}
                  className={campo('')}
                />
              </div>
            </div>

            {erro && <p className="text-red-400 text-sm">{erro}</p>}

            <button
              type="submit"
              disabled={salvando}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-2 rounded-lg font-medium transition"
            >
              {salvando ? 'Criando...' : 'Criar Usuário'}
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="bg-gray-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Usuários Cadastrados</h2>

          {loading ? (
            <p className="text-gray-400">Carregando...</p>
          ) : (
            <div className="space-y-3">
              {usuarios.map(u => (
                <div
                  key={u.id}
                  className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"
                >
                  <div className="space-y-0.5">
                    <p className="font-medium">
                      {u.nome}
                      {u.is_master && (
                        <span className="ml-2 bg-yellow-600 px-2 py-0.5 rounded text-xs font-bold">
                          MASTER
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-400">{u.email}</p>
                    {u.telefone && (
                      <p className="text-xs text-gray-500">{u.telefone}</p>
                    )}
                    {u.endereco && (
                      <p className="text-xs text-gray-500">{u.endereco}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.ativo ? 'bg-green-800 text-green-300' : 'bg-red-900 text-red-300'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    {!u.is_master && (
                      <button
                        onClick={() => toggleAtivo(u.id, u.ativo)}
                        className={`text-sm px-3 py-1 rounded-lg transition font-medium ${u.ativo ? 'bg-red-700 hover:bg-red-600' : 'bg-green-700 hover:bg-green-600'}`}
                      >
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}