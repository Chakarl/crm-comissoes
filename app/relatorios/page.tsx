'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { useRouter } from 'next/navigation'
import { Download, FileSpreadsheet, FileText, Search } from 'lucide-react'
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
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [tipos, setTipos] = useState<TipoProposta[]>([])
  const [dados, setDados] = useState<LinhaRelatorio[]>([])
  const [loading, setLoading] = useState(false)
  const [buscou, setBuscou] = useState(false)

  // Filtros — padrão: mês atual
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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return router.push('/login')
      setUserName(user.user_metadata?.nome || user.email || '')
    })
    supabase
      .from('tipos_proposta')
      .select('*')
      .order('categoria, nome')
      .then(({ data }) => {
        if (data) setTipos(data)
      })
  }, [router])

  async function buscar() {
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

  /* ─── Helpers de formatação ─── */
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

  /* ─── Exportar Excel ─── */
  function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(linhasFormatadas())

    // Larguras automáticas
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

  /* ─── Exportar CSV ─── */
  function exportarCSV() {
    const ws = XLSX.utils.json_to_sheet(linhasFormatadas())
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' })
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio_comissoes_${dataInicio}_${dataFim}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ─── Totais ─── */
  const totalValor = dados.reduce((s, d) => s + d.valor_contratado, 0)
  const totalComissao = dados.reduce((s, d) => s + d.comissao_total, 0)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar
        userName={userName}
        onLogout={async () => {
          await supabase.auth.signOut()
          router.push('/login')
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">📊 Relatório de Comissões</h1>

        {/* ─── Filtros ─── */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Data Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Tipo de Proposta</label>
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
              >
                <option value="">Todos</option>
                {tipos.map((t) => (
                  <option key={t.codigo} value={t.codigo}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={buscar}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                {loading ? 'Buscando…' : 'Buscar'}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Resultados ─── */}
        {buscou && (
          <>
            {/* Totalizadores + botões export */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex flex-wrap gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                  <p className="text-xs text-slate-400">Propostas</p>
                  <p className="text-lg font-bold">{dados.length}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                  <p className="text-xs text-slate-400">Total Contratado</p>
                  <p className="text-lg font-bold text-blue-400">{brl(totalValor)}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                  <p className="text-xs text-slate-400">Total Comissão</p>
                  <p className="text-lg font-bold text-green-400">{brl(totalComissao)}</p>
                </div>
              </div>

              {dados.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={exportarExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors text-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel
                  </button>
                  <button
                    onClick={exportarCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium transition-colors text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    CSV
                  </button>
                </div>
              )}
            </div>

            {/* Tabela */}
            {dados.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                Nenhuma proposta encontrada no período.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left">Nº Contrato</th>
                      <th className="px-4 py-3 text-left">Cliente</th>
                      <th className="px-4 py-3 text-left hidden sm:table-cell">Produto</th>
                      <th className="px-4 py-3 text-left hidden lg:table-cell">Data</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                      <th className="px-4 py-3 text-right">Comissão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {dados.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-900/50">
                        <td className="px-4 py-3 font-mono text-xs">
                          {d.numero_proposta || '-'}
                        </td>
                        <td className="px-4 py-3">{d.nome_cliente}</td>
                        <td className="px-4 py-3 hidden sm:table-cell text-slate-400">
                          {nomeDoTipo(d.tipo_proposta_codigo)}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-slate-400">
                          {new Date(d.data_proposta).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-right">{brl(d.valor_contratado)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-400">
                          {brl(d.comissao_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900 font-semibold">
                    <tr>
                      <td className="px-4 py-3" colSpan={4}>
                        Total
                      </td>
                      <td className="px-4 py-3 text-right">{brl(totalValor)}</td>
                      <td className="px-4 py-3 text-right text-green-400">
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
    </div>
  )
}