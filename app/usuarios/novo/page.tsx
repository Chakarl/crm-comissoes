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

  // Carrega dados do usuário logado
  useEffect(() => {
  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setMeuId(user.id)

    const { data: perfil } = await supabase
      .from('usuarios')
      .select('role, is_master')
      .eq('id', user.id)
      .single()

    if (perfil) {
      // Se is_master = true, trata como master independente do campo role
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
      // Supervisor só vê quem ele cadastrou
      query = query.eq('criado_por', meuId!)
    }
    // Master vê todos (sem filtro extra)

    const { data } = await query
    if (data) setUsuarios(data)
  }

  async function handleCadastrar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome || !email || !telefone || !senha) return
    setLoading(true)

    try {
      // 1. Cria no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
      })

      if (authError || !authData.user) {
        alert('Erro ao criar usuário: ' + (authError?.message || 'Desconhecido'))
        setLoading(false)
        return
      }

      // 2. Insere na tabela usuarios com role e criado_por
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

      // Limpa formulário
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

  async function handleExcluir(id: string) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return
    await supabase.from('usuarios').delete().eq('id', id)
    carregarUsuarios()
  }

  function copiarSenha() {
    navigator.clipboard.writeText(senha)
  }

  // Define quais roles o usuário logado pode criar
  const rolesDisponiveis =
    meuRole === 'master'
      ? [
          { value: 'supervisor', label: 'supervisor', icon: ShieldCheck },
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

  // Promotor não acessa essa página
  if (meuRole === 'promotor') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500 text-lg">Você não tem permissão para acessar esta página.</p>
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
        {/* ——— Formulário ——— */}
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
                          ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-200'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
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
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite o nome completo"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                placeholder="(11) 98765-4321"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, número, bairro, cidade"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha Gerada *</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={senha}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 font-mono text-sm"
                />
              </div>
              <button
                type="button"
                onClick={copiarSenha}
                className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Copy className="w-4 h-4" /> Copiar
              </button>
              <button
                type="button"
                onClick={() => setSenha(gerarSenha())}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Nova
              </button>
            </div>
            <p className="text-xs text-blue-500 mt-1.5">
              A senha será enviada por e-mail automaticamente
            </p>
          </div>

          {/* Botão */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            {loading ? 'Cadastrando...' : 'Cadastrar Usuário'}
          </button>
        </form>

        {/* ——— Lista de Usuários ——— */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 h-fit">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-5">
            <Users className="w-5 h-5 text-amber-500" />
            Usuários Cadastrados ({usuarios.length})
          </h2>

          {usuarios.length === 0 ? (
            <p className="text-slate-400 text-center py-10">Nenhum usuário encontrado.</p>
          ) : (
            <div className="space-y-4">
              {usuarios.map((u) => (
                <div
                  key={u.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    !u.ativo
                      ? 'border-slate-200 bg-slate-50 opacity-60'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{u.nome}</span>
                        {getRoleBadge(u.role)}
                        {!u.ativo && (
                          <span className="text-xs text-red-500 font-medium">INATIVO</span>
                        )}
                      </div>

                      <div className="mt-2 space-y-1 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5" /> {u.email}
                        </div>
                        {u.telefone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5" /> {u.telefone}
                          </div>
                        )}
                        {u.endereco && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5" /> {u.endereco}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações — não mostra pra si mesmo nem pro master */}
                    {u.id !== meuId && u.role !== 'master' && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {u.ativo && (
                          <button
                            onClick={() => handleDesativar(u.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <EyeOff className="w-3.5 h-3.5" /> Desativar
                          </button>
                        )}
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                          onClick={() => handleExcluir(u.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}