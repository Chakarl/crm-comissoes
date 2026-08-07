'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const supabase = createClient()
import {
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Lock,
  Copy,
  RefreshCw,
  Users,
  Shield,
  ShieldCheck,
  User,
  Pencil,
  Trash2,
  EyeOff,
  X,
} from 'lucide-react'

interface Usuario {
  id: string
  nome: string
  email: string
  telefone: string
  endereco: string
  role: string
  ativo: boolean
  criado_por: string | null
}

function gerarSenha(tamanho = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: tamanho }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('')
}

export default function CadastrarUsuarioPage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [senha, setSenha] = useState(gerarSenha())
  const [roleSelecionado, setRoleSelecionado] = useState('promotor')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false)
  const [meuId, setMeuId] = useState<string | null>(null)
  const [meuRole, setMeuRole] = useState<string>('promotor')

  // ✅ Estados para edição
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [editForm, setEditForm] = useState({
    nome: '',
    telefone: '',
    endereco: '',
    role: 'promotor',
  })
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  // Carrega dados do usuário logado
  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      setMeuId(user.id)

      const { data: perfil } = await supabase
        .from('usuarios')
        .select('role, is_master')
        .eq('id', user.id)
        .single()

      if (perfil) {
        if (perfil.is_master) {
          setMeuRole('master')
        } else {
          setMeuRole(perfil.role || 'promotor')
        }
      }
    }
    init()
  }, [])

  // Carrega lista de usuários filtrada por role
  useEffect(() => {
    if (!meuId || !meuRole) return
    carregarUsuarios()
  }, [meuId, meuRole])

  async function carregarUsuarios() {
    let query = supabase
      .from('usuarios')
      .select('id, nome, email, telefone, endereco, role, ativo, criado_por')
      .order('nome')

    if (meuRole === 'supervisor') {
      query = query.eq('criado_por', meuId!)
    }

    const { data } = await query
    if (data) setUsuarios(data)
  }

  async function handleCadastrar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome || !email || !telefone || !senha) return
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
      })

      if (authError || !authData.user) {
        alert('Erro ao criar usuário: ' + (authError?.message || 'Desconhecido'))
        setLoading(false)
        return
      }

      const { error: dbError } = await supabase.from('usuarios').insert({
        id: authData.user.id,
        nome,
        email,
        telefone,
        endereco,
        role: roleSelecionado,
        criado_por: meuId,
        ativo: true,
      })

      if (dbError) {
        alert('Erro ao salvar dados: ' + dbError.message)
        setLoading(false)
        return
      }

      setNome('')
      setEmail('')
      setTelefone('')
      setEndereco('')
      setSenha(gerarSenha())
      setRoleSelecionado('promotor')
      carregarUsuarios()
    } finally {
      setLoading(false)
    }
  }

  async function handleDesativar(id: string) {
    await supabase.from('usuarios').update({ ativo: false }).eq('id', id)
    carregarUsuarios()
  }

  async function handleAtivar(id: string) {
    await supabase.from('usuarios').update({ ativo: true }).eq('id', id)
    carregarUsuarios()
  }

  async function handleExcluir(id: string) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return
    await supabase.from('usuarios').delete().eq('id', id)
    carregarUsuarios()
  }

  // ✅ Abrir modal de edição
  function abrirEditar(u: Usuario) {
    setEditando(u)
    setEditForm({
      nome: u.nome || '',
      telefone: u.telefone || '',
      endereco: u.endereco || '',
      role: u.role || 'promotor',
    })
  }

  // ✅ Salvar edição
  async function handleSalvarEdicao(e: React.FormEvent) {
    e.preventDefault()
    if (!editando) return
    setSalvandoEdicao(true)

    const { error } = await supabase
      .from('usuarios')
      .update({
        nome: editForm.nome,
        telefone: editForm.telefone,
        endereco: editForm.endereco,
        role: editForm.role,
      })
      .eq('id', editando.id)

    setSalvandoEdicao(false)

    if (error) {
      alert('Erro ao salvar: ' + error.message)
      return
    }

    setEditando(null)
    carregarUsuarios()
  }

  function copiarSenha() {
    navigator.clipboard.writeText(senha)
  }

  const rolesDisponiveis =
    meuRole === 'master'
      ? [
          { value: 'supervisor', label: 'Supervisor', icon: ShieldCheck },
          { value: 'promotor', label: 'Promotor', icon: User },
        ]
      : [{ value: 'promotor', label: 'Promotor', icon: User }]

  function getRoleBadge(role: string) {
    switch (role) {
      case 'master':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-300">
            <Shield className="w-3 h-3" /> MASTER
          </span>
        )
      case 'supervisor':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-300">
            <ShieldCheck className="w-3 h-3" /> SUPERVISOR
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
            <User className="w-3 h-3" /> PROMOTOR
          </span>
        )
    }
  }

  if (meuRole === 'promotor') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500 text-lg">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="w-7 h-7 text-blue-600" />
          Cadastrar Novo Usuário
        </h1>
        <p className="text-slate-500 mt-1">
          Crie credenciais de acesso para novos usuários do sistema
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ——— Formulário de Cadastro ——— */}
        <form
          onSubmit={handleCadastrar}
          className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 h-fit"
        >
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400" />
            Dados do Usuário
          </h2>

          {/* Tipo de Usuário */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo de Usuário *
            </label>
            <div className="flex gap-3">
              {rolesDisponiveis.map((r) => {
                const Icon = r.icon
                const selected = roleSelecionado === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRoleSelecionado(r.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all
                      ${
                        selected
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {r.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do usuário"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              />
            </div>
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              />
            </div>
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Endereço completo"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Senha gerada */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha gerada</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={senha}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono"
                />
              </div>
              <button
                type="button"
                onClick={copiarSenha}
                className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                title="Copiar senha"
              >
                <Copy className="w-4 h-4 text-slate-500" />
              </button>
              <button
                type="button"
                onClick={() => setSenha(gerarSenha())}
                className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                title="Gerar nova senha"
              >
                <RefreshCw className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Cadastrando...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Cadastrar Usuário
              </>
            )}
          </button>
        </form>

        {/* ——— Lista de Usuários ——— */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400" />
            Usuários Cadastrados
            <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {usuarios.length}
            </span>
          </h2>

          {usuarios.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Nenhum usuário cadastrado</p>
          ) : (
            <ul className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {usuarios.map((u) => (
                <li
                  key={u.id}
                  className={`rounded-xl border p-4 flex flex-col gap-2 transition-all ${
                    u.ativo
                      ? 'border-slate-200 bg-white'
                      : 'border-red-200 bg-red-50 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-sm">{u.nome}</span>
                      {getRoleBadge(u.role)}
                      {!u.ativo && (
                        <span className="text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded">
                          INATIVO
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {u.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {u.telefone}
                    </span>
                    {u.endereco && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {u.endereco}
                      </span>
                    )}
                  </div>

                  {/* ✅ Ações */}
                  {u.id !== meuId && (
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => abrirEditar(u)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-all"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </button>

                      {u.ativo ? (
                        <button
                          onClick={() => handleDesativar(u.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-600 hover:bg-amber-50 transition-all"
                          title="Desativar"
                        >
                          <EyeOff className="w-3.5 h-3.5" /> Desativar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAtivar(u.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-green-600 hover:bg-green-50 transition-all"
                          title="Ativar"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Ativar
                        </button>
                      )}

                      <button
                        onClick={() => handleExcluir(u.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ✅ Modal de Edição */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form
            onSubmit={handleSalvarEdicao}
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4 relative"
          >
            <button
              type="button"
              onClick={() => setEditando(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-500" />
              Editar Usuário
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
              <input
                type="text"
                value={editForm.nome}
                onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
              <input
                type="tel"
                value={editForm.telefone}
                onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
              <input
                type="text"
                value={editForm.endereco}
                onChange={(e) => setEditForm({ ...editForm, endereco: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {rolesDisponiveis.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={salvandoEdicao}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {salvandoEdicao ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}