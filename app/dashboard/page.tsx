'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from 'recharts'

interface ParcelaAgrupada {
  mes: string
  label: string
  total: number
  recebido: number
  qtd: number
}

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function mesLabel(iso: string) {
  const [ano, m] = iso.split('-')
  return `${MESES_PT[parseInt(m) - 1]}/${ano}`
}

function addMeses(mesStr: string, qtd: number): string {
  const [ano, mes] = mesStr.split('-').map(Number)
  const d = new Date(ano, mes - 1 + qtd, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatCurrencyShort = (value: number) => {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`
  return `R$ ${value.toFixed(0)}`
}

// Tooltip customizado
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-4 min-w-[200px]">
      <p className="text-sm font-semibold text-slate-900 mb-2">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-slate-600">{entry.name}</span>
          </div>
          <span className="text-xs font-bold text-slate-900">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [propostasMes, setPropostasMes] = useState(0)
  const [comissaoMes, setComissaoMes] = useState(0)
  const [comissaoAno, setComissaoAno] = useState(0)
  const [ultimasPropostas, setUltimasPropostas] = useState<any[]>([])
  const [timeline, setTimeline] = useState<ParcelaAgrupada[]>([])
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const now = new Date()
      const anoAtual = now.getFullYear()
      const mesAtual = now.getMonth()

      const { data: todas } = await supabase
        .from('propostas')
        .select('id, comissao_total, data_proposta, numero_proposta, nome_cliente, tipo_proposta_codigo, valor_contratado')
        .order('data_proposta', { ascending: false })

      if (todas) {
        setUltimasPropostas(todas.slice(0, 5))

        const doMes = todas.filter((p) => {
          const d = new Date(p.data_proposta)
          return d.getMonth() === mesAtual && d.getFullYear() === anoAtual
        })
        setPropostasMes(doMes.length)
        setComissaoMes(doMes.reduce((acc, p) => acc + (p.comissao_total || 0), 0))

        const doAno = todas.filter((p) => {
          const d = new Date(p.data_proposta)
          return d.getFullYear() === anoAtual
        })
        setComissaoAno(doAno.reduce((acc, p) => acc + (p.comissao_total || 0), 0))

        // Timeline
        const mapa: Record<string, ParcelaAgrupada> = {}

        for (const p of todas) {
          const mes = (p.data_proposta as string).slice(0, 7)
          if (!mapa[mes]) {
            mapa[mes] = { mes, label: mesLabel(mes), total: 0, recebido: 0, qtd: 0 }
          }
          mapa[mes].total += p.comissao_total || 0
          mapa[mes].qtd += 1
        }

        for (const p of todas) {
          const mesBase = (p.data_proposta as string).slice(0, 7)
          const valor = p.comissao_total || 0
          const tipo = p.tipo_proposta_codigo?.toLowerCase() || ''

          if (tipo.includes('consorcio') || tipo.includes('consórcio')) {
            const parcelaMensal = valor / 5
            for (let i = 1; i <= 5; i++) {
              const mesRecebimento = addMeses(mesBase, i)
              if (!mapa[mesRecebimento]) {
                mapa[mesRecebimento] = { mes: mesRecebimento, label: mesLabel(mesRecebimento), total: 0, recebido: 0, qtd: 0 }
              }
              mapa[mesRecebimento].recebido += parcelaMensal
            }
          } else {
            const mesRecebimento = addMeses(mesBase, 1)
            if (!mapa[mesRecebimento]) {
              mapa[mesRecebimento] = { mes: mesRecebimento, label: mesLabel(mesRecebimento), total: 0, recebido: 0, qtd: 0 }
            }
            mapa[mesRecebimento].recebido += valor
          }
        }

        const lista = Object.values(mapa).sort((a, b) => a.mes.localeCompare(b.mes))
        setTimeline(lista)

        const mesAtualStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`
        setMesSelecionado(
          lista.find((m) => m.mes === mesAtualStr)?.mes || lista[lista.length - 1]?.mes || null
        )
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const idxAtual = timeline.findIndex((m) => m.mes === mesSelecionado)
  const mesAnterior = idxAtual > 0 ? timeline[idxAtual - 1].mes : null
  const mesProximo = idxAtual < timeline.length - 1 ? timeline[idxAtual + 1].mes : null
  const dadosMes = timeline.find((m) => m.mes === mesSelecionado)

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  // Dados para o gráfico (últimos 12 meses)
  const now = new Date()
  const mesAtualStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const ultimos12 = timeline
    .filter((m) => m.mes <= mesAtualStr)
    .slice(-12)
    .map((m) => ({
      ...m,
      totalFormatado: m.total,
      recebidoFormatado: m.recebido,
    }))

  // Acumulado
  let acumuladoTotal = 0
  let acumuladoRecebido = 0
  const dadosAcumulados = ultimos12.map((m) => {
    acumuladoTotal += m.total
    acumuladoRecebido += m.recebido
    return {
      label: m.label,
      'Total Acumulado': acumuladoTotal,
      'Recebido Acumulado': acumuladoRecebido,
    }
  })

  // Variação mês a mês
  const variacao = dadosMes && idxAtual > 0
    ? ((dadosMes.total - timeline[idxAtual - 1].total) / (timeline[idxAtual - 1].total || 1)) * 100
    : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Carregando dashboard...</div>
      </div>
    )
  }

  const cards = [
    { title: 'Propostas do Mês', value: propostasMes, icon: FileText, color: 'bg-blue-500' },
    { title: 'Comissões do Mês', value: `R$ ${fmt(comissaoMes)}`, icon: Calendar, color: 'bg-amber-500' },
    { title: 'Comissão do Ano', value: `R$ ${fmt(comissaoAno)}`, icon: TrendingUp, color: 'bg-emerald-500' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-slate-600">Visão geral do sistema</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.title} className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className={`${card.color} p-2.5 sm:p-3 rounded-lg`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{card.value}</div>
                <div className="text-slate-600 text-xs sm:text-sm font-medium">{card.title}</div>
              </div>
            )
          })}
        </div>

        {/* Gráfico Evolução Mensal */}
        {ultimos12.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 mb-6 sm:mb-8">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                    📊 Evolução Mensal
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Total gerado × Recebido — últimos 12 meses
                  </p>
                </div>
                {dadosMes && (
                  <div className="hidden sm:flex items-center gap-2">
                    {variacao >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                    )}
                    <span
                      className={`text-sm font-semibold ${
                        variacao >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {variacao >= 0 ? '+' : ''}
                      {variacao.toFixed(1)}% vs mês anterior
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={ultimos12} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCurrencyShort}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="total"
                    name="Total Gerado"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    barSize={28}
                  />
                  <Bar
                    dataKey="recebido"
                    name="Recebido"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    barSize={28}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Tendência Gerado"
                    stroke="#1d4ed8"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Gráfico Acumulado */}
        {dadosAcumulados.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 mb-6 sm:mb-8">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                📈 Acumulado no Ano
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Gerado vs Recebido acumulado
              </p>
            </div>

            <div className="p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={dadosAcumulados} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCurrencyShort}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
                    iconType="circle"
                  />
                  <Area
                    type="monotone"
                    dataKey="Total Acumulado"
                    fill="#dbeafe"
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="Recebido Acumulado"
                    fill="#d1fae5"
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Timeline Comissões */}
        {timeline.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 mb-6 sm:mb-8">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">📅 Comissões por Mês</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Total gerado no mês • Recebido (consórcio 5x + outros 1x)
              </p>
            </div>

            {/* Barra de meses */}
            <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-slate-100 overflow-x-auto">
              {timeline.map((m) => {
                const isAtual = m.mes === mesSelecionado
                const isHoje = m.mes === mesAtualStr
                return (
                  <button
                    key={m.mes}
                    onClick={() => setMesSelecionado(m.mes)}
                    className={`
                      flex-shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap
                      ${
                        isAtual
                          ? 'bg-blue-600 text-white'
                          : isHoje
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }
                    `}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>

            {/* Resumo do mês */}
            {dadosMes && (
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <button
                    onClick={() => mesAnterior && setMesSelecionado(mesAnterior)}
                    disabled={!mesAnterior}
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                  </button>

                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">{dadosMes.label}</h3>

                  <button
                    onClick={() => mesProximo && setMesSelecionado(mesProximo)}
                    disabled={!mesProximo}
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="text-xs font-medium text-blue-600 mb-1">Total Gerado</div>
                    <div className="text-xl sm:text-2xl font-bold text-blue-900">
                      R$ {fmt(dadosMes.total)}
                    </div>
                    <div className="text-xs text-blue-500 mt-1">{dadosMes.qtd} proposta(s)</div>
                  </div>

                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <div className="text-xs font-medium text-emerald-600 mb-1">Recebido</div>
                    <div className="text-xl sm:text-2xl font-bold text-emerald-900">
                      R$ {fmt(dadosMes.recebido)}
                    </div>
                    <div className="text-xs text-emerald-500 mt-1">Consórcio 5x + outros 1x</div>
                  </div>

                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <div className="text-xs font-medium text-amber-600 mb-1">Diferença</div>
                    <div className="text-xl sm:text-2xl font-bold text-amber-900">
                      R$ {fmt(dadosMes.total - dadosMes.recebido)}
                    </div>
                    <div className="text-xs text-amber-500 mt-1">Gerado − Recebido</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Últimas Propostas */}
        {ultimasPropostas.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">📋 Últimas Propostas</h2>
              <Link
                href="/propostas"
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Ver todas →
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {ultimasPropostas.map((p) => (
                <Link
                  key={p.id}
                  href={`/propostas/${p.id}`}
                  className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400">#{p.numero_proposta}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {p.tipo_proposta_codigo}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-slate-900 truncate">{p.nome_cliente}</div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <div className="text-sm font-bold text-slate-900">
                      R$ {fmt(p.comissao_total || 0)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(p.data_proposta).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}