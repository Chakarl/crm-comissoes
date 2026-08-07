'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useUsuario } from '@/hooks/useUsuario'
import {
  Plus,
  Search,
  Users as UsersIcon,
  Pencil,
  Trash2,
  X,
  Loader2,
} from 'lucide-react'
import { Paginacao } from '@/components/Paginacao'
import { FiltroMes } from '@/components/FiltroMes'

const POR_PAGINA = 10

interface Cliente {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  agencia: string | null
  conta: string | null
  data_cadastro: string | null
  usuario_id: string | null
}

interface ClienteComData extends Cliente {
  ultimaProposta: string | null
}

const emptyForm = {
  nome: '',
  cpf: '',
  telefone: '',
  agencia: '',
  conta: '',
  data_cadastro: new Date().toISOString().split('T')[0],
}

export default function ClientesPage() {
  const { usuario, loading: loadingUser } = useUsuario()
  const [clientes, setClientes] = useState<ClienteComData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagina, setPagina] = useState(1)
  const [mesFiltro, setMesFiltro] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<ClienteComData | null>(null)
  const [deletando, setDeletando] = useState<string | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const [promotorFiltro, setPromotorFiltro] = useState<string>('todos')
  const [listaPromotores, setListaPromotores] = useState<
    { id: string; nome: string }[]
  >([])

  useEffect(() => {
    if (usuario) {
      if (usuario.is_master) carregarPromotores()
      loadClientes()
    }
  }, [usuario])

  useEffect(() => {
    if (usuario) loadClientes()
  }, [promotorFiltro])

  useEffect(() => {
    setPagina(1)
  }, [search, mesFiltro])

  const carregarPromotores = async () => {
    const { data: usuarios } = await supabase.rpc('listar_todos_usuarios')
    if (usuarios) {
      const Promotores = usuarios
        .filter((u: any) => !u.is_master)
        .map((u: any) => ({ id: u.id, nome: u.nome || 'Sem nome' }))
      setListaPromotores(Promotores)
    }
  }

  const loadClientes = async () => {
    if (!usuario) return
    setLoading(true)

    let queryClientes = supabase
      .from('clientes')
      .select('*')
      .order('nome', { ascending: true })

    if (!usuario.is_master) {
      queryClientes = queryClientes.eq('usuario_id', usuario.id)
    } else if (promotorFiltro !== 'todos') {
      queryClientes = queryClientes.eq('usuario_id', promotorFiltro)
    }

    let queryPropostas = supabase
      .from('propostas')
      .select('nome_cliente, data_proposta')

    if (!usuario.is_master) {
      queryPropostas = queryPropostas.eq('usuario_id', usuario.id)
    } else if (promotorFiltro !== 'todos') {
      queryPropostas = queryPropostas.eq('usuario_id', promotorFiltro)
    }

    const { data: clientesData } = await queryClientes
    const { data: propostasData } = await queryPropostas

    const mapaData: Record<string, string> = {}
    if (propostasData) {
      propostasData.forEach((p) => {
        if (!p.nome_cliente || !p.data_proposta) return
        const nome = p.nome_cliente.toLowerCase()
        if (!mapaData[nome] || p.data_proposta > mapaData[nome]) {
          mapaData[nome] = p.data_proposta
        }
      })
    }

    const resultado: ClienteComData[] = (clientesData || []).map((c) => ({
      ...c,
      ultimaProposta: mapaData[c.nome.toLowerCase()] || null,
    }))

    setClientes(resultado)
    setLoading(false)
  }

  const abrirNovo = () => {
    setEditando(null)
    setFormData(emptyForm)
    setShowModal(true)
  }

  const abrirEditar = (c: ClienteComData) => {
    setEditando(c)
    setFormData({
      nome: c.nome || '',
      cpf: c.cpf || '',
      telefone: c.telefone || '',
      agencia: c.agencia || '',
      conta: c.conta || '',
      data_cadastro: c.data_cadastro || new Date().toISOString().split('T')[0],
    })
    setShowModal(true)
  }

  const fecharModal = () => {
    setShowModal(false)
    setEditando(null)
    setFormData(emptyForm)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuario) return
    setSaving(true)

    if (editando) {
      const { error } = await supabase
        .from('clientes')
        .update(formData)
        .eq('id', editando.id)
      if (!error) {
        fecharModal()
        loadClientes()
      }
    } else {
      const { error } = await supabase
        .from('clientes')
        .insert([{ ...formData, usuario_id: usuario.id }])
      if (!error) {
        fecharModal()
        loadClientes()
      }
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    setDeletando(id)
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (!error) setClientes((prev) => prev.filter((c) => c.id !== id))
    setDeletando(null)
  }

  const nomePromotorMap: Record<string, string> = {}
  listaPromotores.forEach((c) => {
    nomePromotorMap[c.id] = c.nome
  })

  const datasDisponiveis = clientes
    .map((c) => c.data_cadastro || c.ultimaProposta || '')
    .filter(Boolean)

  const filtered = clientes.filter((c) => {
    const dataRef = c.data_cadastro || c.ultimaProposta || ''
    const matchMes = !mesFiltro || dataRef.startsWith(mesFiltro)
    const matchSearch =
      c.nome?.toLowerCase().includes(search.toLowerCase()) ||
      c.cpf?.toLowerCase().includes(search.toLowerCase())
    return matchMes && matchSearch
  })

  const totalPaginas = Math.ceil(filtered.length / POR_PAGINA)
  const pag = Math.min(pagina, totalPaginas || 1)
  const fatia = filtered.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA)

  if (loadingUser || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Carregando clientes...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">
              Clientes
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              {filtered.length} cliente{filtered.length !== 1 && 's'}
              {search && ` encontrado${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Novo Cliente
          </button>
        </div>

        {/* Filtro por Promotor (master only) */}
        {usuario?.is_master && (
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <UsersIcon className="w-4 h-4 text-violet-500" />
              <span className="font-medium">Promotor:</span>
            </div>
            <select
              value={promotorFiltro}
              onChange={(e) => {
                setPromotorFiltro(e.target.value)
                setPagina(1)
              }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todos os Promotores</option>
              {listaPromotores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Busca */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Filtro por Mês */}
        <FiltroMes
          mesSelecionado={mesFiltro}
          onSelecionar={setMesFiltro}
          datasDisponiveis={datasDisponiveis}
        />

        {/* Desktop Table */}
        <div className="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                  Data
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                  Nome
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                  CPF
                </th>
                {usuario?.is_master && promotorFiltro === 'todos' && (
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                    Promotor
                  </th>
                )}
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                  Agência
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                  Conta
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                  Telefone
                </th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {fatia.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-6 py-4 text-slate-700">
                    {c.data_cadastro
                      ? new Date(c.data_cadastro + 'T00:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {c.nome}
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {c.cpf || '—'}
                  </td>
                  {usuario?.is_master && promotorFiltro === 'todos' && (
                    <td className="px-6 py-4 text-slate-700">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                        {(c.usuario_id && nomePromotorMap[c.usuario_id]) || '—'}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 text-slate-700">
                    {c.agencia || '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {c.conta || '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {c.telefone || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => abrirEditar(c)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir o cliente "${c.nome}"?`))
                            handleDelete(c.id)
                        }}
                        disabled={deletando === c.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Excluir"
                      >
                        {deletando === c.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {fatia.length === 0 && (
                <tr>
                  <td
                    colSpan={
                      (usuario?.is_master && promotorFiltro === 'todos' ? 9 : 8)
                    }
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    <UsersIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">Nenhum cliente encontrado</p>
                    <p className="text-sm mt-1">
                      Ajuste os filtros ou cadastre um novo cliente.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3">
          {fatia.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{c.nome}</h3>
                  <p className="text-sm text-slate-500">{c.cpf || 'Sem CPF'}</p>
                  {usuario?.is_master && promotorFiltro === 'todos' && (
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                      {(c.usuario_id && nomePromotorMap[c.usuario_id]) || '—'}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => abrirEditar(c)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir o cliente "${c.nome}"?`))
                        handleDelete(c.id)
                    }}
                    disabled={deletando === c.id}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  >
                    {deletando === c.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-500">Data</span>
                  <p className="font-medium text-slate-900">
                    {c.data_cadastro
                      ? new Date(c.data_cadastro + 'T00:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Telefone</span>
                  <p className="font-medium text-slate-900">
                    {c.telefone || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Agência</span>
                  <p className="font-medium text-slate-900">
                    {c.agencia || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Conta</span>
                  <p className="font-medium text-slate-900">
                    {c.conta || '—'}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {fatia.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
              <UsersIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">Nenhum cliente encontrado</p>
              <p className="text-sm mt-1">
                Ajuste os filtros ou cadastre um novo cliente.
              </p>
            </div>
          )}
        </div>

        {/* Paginação */}
        <Paginacao
          paginaAtual={pag}
          totalPaginas={totalPaginas}
          onMudar={setPagina}
        />
      </div>

      {/* Modal Novo / Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                {editando ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button
                onClick={fecharModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Data */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Data *
                </label>
                <input
                  type="date"
                  required
                  value={formData.data_cadastro}
                  onChange={(e) =>
                    setFormData({ ...formData, data_cadastro: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* CPF */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  CPF
                </label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) =>
                    setFormData({ ...formData, cpf: e.target.value })
                  }
                  placeholder="000.000.000-00"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Agência e Conta lado a lado */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Agência
                  </label>
                  <input
                    type="text"
                    value={formData.agencia}
                    onChange={(e) =>
                      setFormData({ ...formData, agencia: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Conta
                  </label>
                  <input
                    type="text"
                    value={formData.conta}
                    onChange={(e) =>
                      setFormData({ ...formData, conta: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone: e.target.value })
                  }
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editando ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}