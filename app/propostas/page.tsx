'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Plus, Search, FileText, Pencil, Trash2 } from 'lucide-react'
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
}

export default function PropostasPage() {
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagina, setPagina] = useState(1)
  const [mesFiltro, setMesFiltro] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { loadPropostas() }, [])
  useEffect(() => { setPagina(1) }, [search, mesFiltro])

  const loadPropostas = async () => {
    const { data, error } = await supabase
      .from('propostas')
      .select('id, numero_proposta, tipo_proposta_codigo, data_proposta, nome_cliente, valor_contratado, prazo, comissao_total')
      .order('data_proposta', { ascending: false })

    if (error) console.error('Erro ao carregar propostas:', error)
    if (data) setPropostas(data)
    setLoading(false)
  }

  const handleDelete = async (id: string, numero: string) => {
    if (!confirm(`Tem certeza que deseja excluir a proposta ${numero}?\nAs parcelas vinculadas também serão removidas.`)) return

    await supabase.from('parcelas_comissao').delete().eq('proposta_id', id)
    const { error } = await supabase.from('propostas').delete().eq('id', id)

    if (error) {
      alert('Erro ao excluir: ' + error.message)
    } else {
      setPropostas((prev) => prev.filter((p) => p.id !== id))
    }
  }

  // Filtro por mês + busca
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

  if (loading) {
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
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">Propostas</h1>
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
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Número</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Cliente</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Tipo</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Data</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Valor</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Comissão</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {fatia.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{p.numero_proposta}</td>
                  <td className="px-6 py-4 text-slate-700">{p.nome_cliente}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {p.tipo_proposta_codigo}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {new Date(p.data_proposta + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {p.valor_contratado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-6 py-4 font-semibold text-green-700">
                    {p.comissao_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma proposta encontrada</p>
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {fatia.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{p.numero_proposta}</p>
                  <p className="text-slate-600 text-xs">{p.nome_cliente}</p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {p.tipo_proposta_codigo}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <p className="text-slate-500 text-xs">Data</p>
                  <p className="font-medium text-slate-900">
                    {new Date(p.data_proposta + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Valor</p>
                  <p className="font-medium text-slate-900">
                    {p.valor_contratado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Comissão</p>
                  <p className="font-semibold text-green-700">
                    {p.comissao_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Link
                  href={`/propostas/${p.id}/editar`}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(p.id, p.numero_proposta)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma proposta encontrada</p>
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
    </div>
  )
}