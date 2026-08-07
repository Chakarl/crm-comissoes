'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useUsuario } from '@/hooks/useUsuario'
import Link from 'next/link'
import { Plus, Search, FileText, Pencil, Trash2, Users } from 'lucide-react'
import { Paginacao } from '@/components/Paginacao'
import { FiltroMes } from '@/components/FiltroMes'

const POR_PAGINA = 10

interface Proposta {
  id: string
  numero_proposta: string
  tipo_proposta_codigo: string
  data_proposta: string
  nome_cliente: string
  valor_contratado: number
  prazo: number | null
  comissao_total: number
  usuario_id: string
}

export default function PropostasPage() {
  const { usuario, loading: loadingUser } = useUsuario()
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagina, setPagina] = useState(1)
  const [mesFiltro, setMesFiltro] = useState<string | null>(null)
  const supabase = createClient()

  // ── Filtro por Promotor (master only) ──
  const [promotorFiltro, setPromotorFiltro] = useState<string>('todos')
  const [listaPromotores, setListaPromotores] = useState<{ id: string; nome: string }[]>([])

  useEffect(() => {
    if (usuario) {
      if (usuario.is_master) carregarPromotores()
      loadPropostas()
    }
  }, [usuario])

  // Recarrega propostas quando muda o filtro de Promotor
  useEffect(() => {
    if (usuario) loadPropostas()
  }, [promotorFiltro])

  useEffect(() => {
    setPagina(1)
  }, [search, mesFiltro])

  const carregarPromotores = async () => {
    const { data: usuarios } = await supabase.rpc('listar_todos_usuarios')
    if (usuarios) {
      const promotores = usuarios
        .filter((u: any) => !u.is_master)
        .map((u: any) => ({ id: u.id, nome: u.nome || 'Sem nome' }))
      setListaPromotores(promotores)
    }
  }

  const loadPropostas = async () => {
    if (!usuario) return
    setLoading(true)

    let query = supabase
      .from('propostas')
      .select(
        'id, numero_proposta, tipo_proposta_codigo, data_proposta, nome_cliente, valor_contratado, prazo, comissao_total, usuario_id'
      )
      .order('data_proposta', { ascending: false })

    if (!usuario.is_master) {
      query = query.eq('usuario_id', usuario.id)
    } else if (promotorFiltro !== 'todos') {
      query = query.eq('usuario_id', promotorFiltro)
    }

    const { data, error } = await query

    if (error) console.error('Erro ao carregar propostas:', error)
    if (data) setPropostas(data)
    setLoading(false)
  }

  const handleDelete = async (id: string, numero: string) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir a proposta ${numero}?\nAs parcelas vinculadas também serão removidas.`
      )
    )
      return

    await supabase.from('parcelas_comissao').delete().eq('proposta_id', id)
    const { error } = await supabase.from('propostas').delete().eq('id', id)

    if (error) {
      alert('Erro ao excluir: ' + error.message)
    } else {
      setPropostas((prev) => prev.filter((p) => p.id !== id))
    }
  }

  // Mapa de nomes dos promotores para exibição
  const nomePromotorMap: Record<string, string> = {}
  listaPromotores.forEach((c) => { nomePromotorMap[c.id] = c.nome })

  const filtered = propostas.filter((p) => {
    const matchMes = !mesFiltro || p.data_proposta?.startsWith(mesFiltro)
    const matchSearch =
      p.numero_proposta?.toLowerCase().includes(search.toLowerCase()) ||
      p.nome_cliente?.toLowerCase().includes(search.toLowerCase())
    return matchMes && matchSearch
  })

  const totalPaginas = Math.ceil(filtered.length / POR_PAGINA)
  const pag = Math.min(pagina, totalPaginas || 1)
  const fatia = filtered.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA)

  if (loadingUser || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Carregando propostas...</div>
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
              Propostas
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              {filtered.length} proposta{filtered.length !== 1 && 's'}
              {search && ` encontrada${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Link
            href="/propostas/nova"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Nova Proposta
          </Link>
        </div>

        {/* ── Filtro por Promotor (master only) ── */}
        {usuario?.is_master && (
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users className="w-4 h-4 text-violet-500" />
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
              placeholder="Buscar por número ou cliente..."
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
          datasDisponiveis={propostas.map((p) => p.data_proposta)}
        />

        {/* Desktop Table */}
        <div className="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                  Número
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                  Cliente
                </th>
                {usuario?.is_master && promotorFiltro === 'todos' && (
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                    Promotor
                  </th>
                )}
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                  Tipo
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                  Data
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                  Valor
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                  Comissão
                </th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {fatia.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {p.numero_proposta}
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {p.nome_cliente}
                  </td>
                  {usuario?.is_master && promotorFiltro === 'todos' && (
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {nomePromotorMap[p.usuario_id] || '—'}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {p.tipo_proposta_codigo}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {new Date(
                      p.data_proposta + 'T00:00:00'
                    ).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {p.valor_contratado.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                  <td className="px-6 py-4 font-semibold text-green-700">
                    {p.comissao_total.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/propostas/${p.id}/editar`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id, p.numero_proposta)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {fatia.length === 0 && (
                <tr>
                  <td
                    colSpan={usuario?.is_master && promotorFiltro === 'todos' ? 8 : 7}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    Nenhuma proposta encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3">
          {fatia.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400">
                      #{p.numero_proposta}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {p.tipo_proposta_codigo}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {p.nome_cliente}
                  </div>
                  {usuario?.is_master && promotorFiltro === 'todos' && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      Promotor: {nomePromotorMap[p.usuario_id] || '—'}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/propostas/${p.id}/editar`}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id, p.numero_proposta)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-500">Data:</span>{' '}
                  <span className="text-slate-700">
                    {new Date(
                      p.data_proposta + 'T00:00:00'
                    ).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Valor:</span>{' '}
                  <span className="text-slate-700">
                    {p.valor_contratado.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Comissão:</span>{' '}
                  <span className="font-semibold text-green-700">
                    {p.comissao_total.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {fatia.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
              Nenhuma proposta encontrada.
            </div>
          )}
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="mt-6">
            <Paginacao
              paginaAtual={pag}
              totalPaginas={totalPaginas}
              onMudar={setPagina}
            />
          </div>
        )}
      </div>
    </div>
  )
}