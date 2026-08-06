'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useUsuario } from '@/hooks/useUsuario'
import { Search, FileSpreadsheet, FileText, Users as UsersIcon } from 'lucide-react'
import * as XLSX from 'xlsx'

const supabase = createClient()

interface TipoProposta {
  id: number
  codigo: string
  nome: string
}

interface LinhaRelatorio {
  numero_proposta: string
  nome_cliente: string
  tipo_proposta_codigo: string
  data_proposta: string
  valor_contratado: number
  comissao_pct: number | null
  comissao_total: number
}

export default function RelatoriosPage() {
  const { usuario, loading: loadingUser } = useUsuario()
  const [tipos, setTipos] = useState<TipoProposta[]>([])
  const [dados, setDados] = useState<LinhaRelatorio[]>([])
  const [loading, setLoading] = useState(false)
  const [buscou, setBuscou] = useState(false)

  // ── Filtro de corretor (master only) ──
  const [corretorFiltro, setCorretorFiltro] = useState<string>('todos')
  const [listaCorretores, setListaCorretores] = useState<
    { id: string; nome: string }[]
  >([])

  const hoje = new Date()
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    .toISOString()
    .split('T')[0]
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]

  const [dataInicio, setDataInicio] = useState(primeiroDia)
  const [dataFim, setDataFim] = useState(ultimoDia)
  const [tipoFiltro, setTipoFiltro] = useState('')

  useEffect(() => {
    supabase
      .from('tipos_proposta')
      .select('*')
      .order('categoria, nome')
      .then(({ data }) => {
        if (data) setTipos(data)
      })
  }, [])

  useEffect(() => {
    if (usuario?.is_master) carregarCorretores()
  }, [usuario])

  const carregarCorretores = async () => {
    const { data: usuarios } = await supabase.rpc('listar_todos_usuarios')
    if (usuarios) {
      const corretores = usuarios
        .filter((u: any) => !u.is_master)
        .map((u: any) => ({ id: u.id, nome: u.nome || 'Sem nome' }))
      setListaCorretores(corretores)
    }
  }

  async function buscar() {
    if (!usuario) return
    setLoading(true)
    setBuscou(true)

    let query = supabase
      .from('propostas')
      .select(
        'numero_proposta, nome_cliente, tipo_proposta_codigo, data_proposta, valor_contratado, comissao_pct, comissao_total'
      )
      .gte('data_proposta', dataInicio)
      .lte('data_proposta', dataFim)
      .order('data_proposta', { ascending: false })

    // ── Aplica filtro de usuário ──
    if (!usuario.is_master) {
      query = query.eq('usuario_id', usuario.id)
    } else if (corretorFiltro !== 'todos') {
      query = query.eq('usuario_id', corretorFiltro)
    }

    if (tipoFiltro) {
      query = query.eq('tipo_proposta_codigo', tipoFiltro)
    }

    const { data, error } = await query
    if (error) {
      console.error(error)
      setDados([])
    } else {
      setDados(data || [])
    }
    setLoading(false)
  }

  function brl(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function nomeDoTipo(codigo: string) {
    return tipos.find((t) => t.codigo === codigo)?.nome || codigo
  }

  function linhasFormatadas() {
    return dados.map((d) => ({
      'Nº Contrato': d.numero_proposta || '-',
      Cliente: d.nome_cliente,
      Produto: nomeDoTipo(d.tipo_proposta_codigo),
      Data: new Date(d.data_proposta).toLocaleDateString('pt-BR'),
      'Valor Proposta': d.valor_contratado,
      'Comissão %': d.comissao_pct ? `${d.comissao_pct}%` : 'Fixo',
      'Valor Comissão': d.comissao_total,
    }))
  }

  function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(linhasFormatadas())
    ws['!cols'] = [
      { wch: 18 },
      { wch: 30 },
      { wch: 25 },
      { wch: 12 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Comissões')
    XLSX.writeFile(wb, `relatorio_comissoes_${dataInicio}_${dataFim}.xlsx`)
  }

  function exportarCSV() {
    const ws = XLSX.utils.json_to_sheet(linhasFormatadas())
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' })
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio_comissoes_${dataInicio}_${dataFim}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalValor = dados.reduce((s, d) => s + d.valor_contratado, 0)
  const totalComissao = dados.reduce((s, d) => s + d.comissao_total, 0)

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Carregando…</div>
      </div>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">📊 Relatório de Comissões</h1>

      {/* ─── Filtros ─── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 mb-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-slate-500 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-500 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-500 mb-1">
              Tipo de Proposta
            </label>
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900"
            >
              <option value="">Todos</option>
              {tipos.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>

          {/* ── Filtro Corretor (master only) ── */}
          {usuario?.is_master ? (
            <div>
              <label className="block text-sm text-slate-500 mb-1">
                <span className="inline-flex items-center gap-1">
                  <UsersIcon className="w-3.5 h-3.5 text-violet-500" />
                  Corretor
                </span>
              </label>
              <select
                value={corretorFiltro}
                onChange={(e) => setCorretorFiltro(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900"
              >
                <option value="todos">Todos os Corretores</option>
                {listaCorretores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            /* Mantém o botão na 4ª coluna quando não é master */
            <div className="flex items-end">
              <button
                onClick={buscar}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                {loading ? 'Buscando…' : 'Buscar'}
              </button>
            </div>
          )}
        </div>

        {/* Botão Buscar em linha separada quando é master (5 campos) */}
        {usuario?.is_master && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={buscar}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
        )}
      </div>

      {/* ─── Resultados ─── */}
      {buscou && (
        <>
          {/* Totalizadores + Export */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex flex-wrap gap-4">
              <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm">
                <p className="text-xs text-slate-500">Propostas</p>
                <p className="text-lg font-bold text-slate-900">
                  {dados.length}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm">
                <p className="text-xs text-slate-500">Total Contratado</p>
                <p className="text-lg font-bold text-blue-600">
                  {brl(totalValor)}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm">
                <p className="text-xs text-slate-500">Total Comissão</p>
                <p className="text-lg font-bold text-green-600">
                  {brl(totalComissao)}
                </p>
              </div>
            </div>

            {dados.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={exportarExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </button>
                <button
                  onClick={exportarCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  <FileText className="w-4 h-4" />
                  CSV
                </button>
              </div>
            )}
          </div>

          {/* Tabela */}
          {dados.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              Nenhuma proposta encontrada no período.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Nº Contrato</th>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">
                      Produto
                    </th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">
                      Data
                    </th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3 text-right">Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {dados.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {d.numero_proposta || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        {d.nome_cliente}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-slate-500">
                        {nomeDoTipo(d.tipo_proposta_codigo)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-slate-500">
                        {new Date(d.data_proposta).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900">
                        {brl(d.valor_contratado)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">
                        {brl(d.comissao_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-semibold text-slate-700">
                  <tr>
                    <td className="px-4 py-3" colSpan={4}>
                      Total
                    </td>
                    <td className="px-4 py-3 text-right">
                      {brl(totalValor)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {brl(totalComissao)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  )
}