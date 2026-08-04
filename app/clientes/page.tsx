'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Search, Users as UsersIcon, Pencil, Trash2, X, Loader2 } from 'lucide-react'
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
  created_at: string
}

const emptyForm = { nome: '', cpf: '', telefone: '', agencia: '', conta: '' }

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagina, setPagina] = useState(1)
  const [mesFiltro, setMesFiltro] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [deletando, setDeletando] = useState<string | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadClientes() }, [])
  useEffect(() => { setPagina(1) }, [search, mesFiltro])

  const loadClientes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('id, nome, cpf, telefone, agencia, conta, created_at')
      .order('nome', { ascending: true })
    if (data) setClientes(data)
    setLoading(false)
  }

  const abrirNovo = () => {
    setEditando(null)
    setFormData(emptyForm)
    setShowModal(true)
  }

  const abrirEditar = (c: Cliente) => {
    setEditando(c)
    setFormData({
      nome: c.nome || '',
      cpf: c.cpf || '',
      telefone: c.telefone || '',
      agencia: c.agencia || '',
      conta: c.conta || '',
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
    setSaving(true)

    if (editando) {
      const { error } = await supabase.from('clientes').update(formData).eq('id', editando.id)
      if (!error) { fecharModal(); loadClientes() }
    } else {
      const { error } = await supabase.from('clientes').insert([formData])
      if (!error) { fecharModal(); loadClientes() }
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    setDeletando(id)
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (!error) setClientes((prev) => prev.filter((c) => c.id !== id))
    setDeletando(null)
  }

  // Filtro por mês (usa created_at) + busca
  const filtered = clientes.filter((c) => {
    const matchMes = !mesFiltro || c.created_at?.startsWith(mesFiltro)
    const matchSearch =
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.cpf?.includes(search)
    return matchMes && matchSearch
  })

  const totalPaginas = Math.ceil(filtered.length / POR_PAGINA)
  const pag = Math.min(pagina, totalPaginas || 1)
  const fatia = filtered.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA)

  if (loading) {
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
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">Clientes</h1>
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
          datasDisponiveis={clientes.map((c) => c.created_at)}
        />

        {/* Desktop Table */}
        <div className="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Nome</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">CPF</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Telefone</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Agência/Conta</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Cadastro</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {fatia.map((cliente) => (
                <tr key={cliente.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{cliente.nome}</td>
                  <td className="px-6 py-4 text-slate-700">{cliente.cpf || '-'}</td>
                  <td className="px-6 py-4 text-slate-700">{cliente.telefone || '-'}</td>
                  <td className="px-6 py-4 text-slate-700">
                    {cliente.agencia && cliente.conta ? `${cliente.agencia}/${cliente.conta}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {new Date(cliente.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => abrirEditar(cliente)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir "${cliente.nome}"?`)) handleDelete(cliente.id)
                        }}
                        disabled={deletando === cliente.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Excluir"
                      >
                        {deletando === cliente.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum cliente encontrado</p>
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {fatia.map((cliente) => (
            <div key={cliente.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{cliente.nome}</p>
                  <p className="text-slate-600 text-xs">{cliente.cpf || 'CPF não informado'}</p>
                </div>
                <p className="text-slate-400 text-xs">
                  {new Date(cliente.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <p className="text-slate-500 text-xs">Telefone</p>
                  <p className="font-medium text-slate-900">{cliente.telefone || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Agência/Conta</p>
                  <p className="font-medium text-slate-900">
                    {cliente.agencia && cliente.conta ? `${cliente.agencia}/${cliente.conta}` : '-'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => abrirEditar(cliente)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Excluir "${cliente.nome}"?`)) handleDelete(cliente.id)
                  }}
                  disabled={deletando === cliente.id}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deletando === cliente.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum cliente encontrado</p>
            </div>
          )}
        </div>

        {/* Paginação */}
        <Paginacao
          paginaAtual={pag}
          totalPaginas={totalPaginas}
          totalItens={filtered.length}
          itensPorPagina={POR_PAGINA}
          onMudar={setPagina}
        />
      </div>

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {editando ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={fecharModal} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                <input
                  required
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Agência</label>
                  <input
                    type="text"
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Conta</label>
                  <input
                    type="text"
                    value={formData.conta}
                    onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
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