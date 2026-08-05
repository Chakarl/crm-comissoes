'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useUsuario } from '@/hooks/useUsuario'
import Link from 'next/link'
import {
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  Crown,
} from 'lucide-react'
import {
  Bar,
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-4 min-w-[200px]">
      <p className="text-sm font-semibold text-slate-900 mb-2">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
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
  const { usuario, loading: loadingUser } = useUsuario()
  const supabase = createClient()

  const [propostasMes, setPropostasMes] = useState(0)
  const [aReceberProxMes, setAReceberProxMes] = useState(0)
  const [comissaoAno, setComissaoAno] = useState(0)
  const [ultimasPropostas, setUltimasPropostas] = useState<any[]>([])
  const [timeline, setTimeline] = useState<ParcelaAgrupada[]>([])
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Master-only
  const [totalCorretores, setTotalCorretores] = useState(0)
  const [rankingCorretores, setRankingCorretores] = useState<
    { usuario_id: string; nome: string; propostas: number; comissao: number }[]
  >([])
  const [corretorFiltro, setCorretorFiltro] = useState<string>('todos')
  const [listaCorretores, setListaCorretores] = useState<{ id: string; nome: string }[]>([])

  useEffect(() => {
    if (!loadingUser && usuario) loadDashboard()
  }, [loadingUser, usuario, corretorFiltro])

  const loadDashboard = async () => {
    if (!usuario) return
    setLoading(true)

    try {
      const now = new Date()
      const anoAtual = now.getFullYear()
      const mesAtual = now.getMonth()
      const mesAtualStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`
      const proxMesStr = addMeses(mesAtualStr, 1)

      // ── Corretores (master only) ──
      let todosUsuariosLocal: { id: string; nome: string; is_master: boolean }[] = []

      if (usuario.is_master) {
        const { data: usuarios } = await supabase
          .from('usuarios')
          .select('id, nome, is_master')
          .order('nome')

        if (usuarios) {
          todosUsuariosLocal = usuarios
          const corretores = usuarios.filter((u) => !u.is_master)
          setListaCorretores(corretores.map((u) => ({ id: u.id, nome: u.nome || 'Sem nome' })))
          setTotalCorretores(corretores.length)
        }
      }

      // ── Propostas ──
      let query = supabase
        .from('propostas')
        .select(
          'id, comissao_total, data_proposta, numero_proposta, nome_cliente, tipo_proposta_codigo, valor_contratado, usuario_id'
        )
        .order('data_proposta', { ascending: false })

      if (!usuario.is_master) {
        query = query.eq('usuario_id', usuario.id)
      } else if (corretorFiltro !== 'todos') {
        query = query.eq('usuario_id', corretorFiltro)
      }

      const { data: todas } = await query

      if (todas) {
        setUltimasPropostas(todas.slice(0, 5))

        // Propostas do mês atual
        const doMes = todas.filter((p) => {
          const mesProposta = (p.data_proposta as string)?.slice(0, 7)
          return mesProposta === mesAtualStr
        })
        setPropostasMes(doMes.length)

        // Comissão do ano
        const doAno = todas.filter((p) => {
          return (p.data_proposta as string)?.startsWith(String(anoAtual))
        })
        setComissaoAno(doAno.reduce((acc, p) => acc + (p.comissao_total || 0), 0))

        // ── Ranking corretores (master, visão todos) ──
        if (usuario.is_master && corretorFiltro === 'todos') {
          const mapaRank: Record<
            string,
            { usuario_id: string; nome: string; propostas: number; comissao: number }
          > = {}
          for (const p of todas) {
            const uid = p.usuario_id
            if (!mapaRank[uid]) {
              const usr = todosUsuariosLocal.find((u) => u.id === uid)
              mapaRank[uid] = {
                usuario_id: uid,
                nome: usr?.nome || 'Desconhecido',
                propostas: 0,
                comissao: 0,
              }
            }
            if ((p.data_proposta as string)?.startsWith(String(anoAtual))) {
              mapaRank[uid].propostas += 1
              mapaRank[uid].comissao += p.comissao_total || 0
            }
          }
          setRankingCorretores(
            Object.values(mapaRank).sort((a, b) => b.comissao - a.comissao)
          )
        }

        // ============================================
        // TIMELINE + CÁLCULO "A RECEBER PRÓX. MÊS"
        // ============================================
        const mapa: Record<string, ParcelaAgrupada> = {}

        // 1) Total gerado por mês
        for (const p of todas) {
          const mes = (p.data_proposta as string).slice(0, 7)
          if (!mapa[mes]) {
            mapa[mes] = { mes, label: mesLabel(mes), total: 0, recebido: 0, qtd: 0 }
          }
          mapa[mes].total += p.comissao_total || 0
          mapa[mes].qtd += 1
        }

        // 2) Recebido por mês (consórcio 5 parcelas, outros 1 mês depois)
        for (const p of todas) {
          const mesBase = (p.data_proposta as string).slice(0, 7)
          const valor = p.comissao_total || 0
          const tipo = p.tipo_proposta_codigo?.toLowerCase() || ''

          if (tipo.includes('consorcio') || tipo.includes('consórcio')) {
            const parcelaMensal = valor / 5
            for (let i = 1; i <= 5; i++) {
              const mesReceb = addMeses(mesBase, i)
              if (!mapa[mesReceb]) {
                mapa[mesReceb] = { mes: mesReceb, label: mesLabel(mesReceb), total: 0, recebido: 0, qtd: 0 }
              }
              mapa[mesReceb].recebido += parcelaMensal
            }
          } else {
            const mesReceb = addMeses(mesBase, 1)
            if (!mapa[mesReceb]) {
              mapa[mesReceb] = { mes: mesReceb, label: mesLabel(mesReceb), total: 0, recebido: 0, qtd: 0 }
            }
            mapa[mesReceb].recebido += valor
          }
        }

        const lista = Object.values(mapa).sort((a, b) => a.mes.localeCompare(b.mes))
        setTimeline(lista)

        const dadosProxMes = lista.find((m) => m.mes === proxMesStr)
        setAReceberProxMes(dadosProxMes?.recebido || 0)

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

  const now2 = new Date()
  const mesAtualStr2 = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}`
  const proxMesLabel = mesLabel(addMeses(mesAtualStr2, 1))

  const ultimos12 = timeline
    .filter((m) => m.mes <= mesAtualStr2)
    .slice(-12)
    .map((m) => ({
      ...m,
      totalFormatado: m.total,
      recebidoFormatado: m.recebido,
    }))

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

  const variacao =
    dadosMes && idxAtual > 0
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
    {
      title: 'Propostas do Mês',
      value: propostasMes,
      icon: FileText,
      color: 'bg-blue-500',
      subtitle: null,
    },
    {
      title: `A Receber em ${proxMesLabel}`,
      value: `R$ ${fmt(aReceberProxMes)}`,
      icon: DollarSign,
      color: 'bg-violet-500',
      subtitle: 'Parcelas consórcio + comissões do mês',
    },
    {
      title: 'Comissão do Ano',
      value: `R$ ${fmt(comissaoAno)}`,
      icon: TrendingUp,
      color: 'bg-emerald-500',
      subtitle: null,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-slate-600">Visão geral do sistema</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
                {card.subtitle && (
                  <div className="text-slate-400 text-[10px] sm:text-xs mt-1">{card.subtitle}</div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Filtro + Corretores Ativos (master only) ── */}
        {usuario?.is_master && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
              <Users className="w-5 h-5 text-violet-500" />
              <div>
                <div className="text-xs text-slate-500">Corretores Ativos</div>
                <div className="text-lg font-bold text-slate-900">{totalCorretores}</div>
              </div>
            </div>

            <select
              value={corretorFiltro}
              onChange={(e) => setCorretorFiltro(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="todos">Todos os Corretores</option>
              {listaCorretores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        )}

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
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} iconType="circle" />
                  <Bar dataKey="total" name="Total Gerado" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={28} />
                  <Bar dataKey="recebido" name="Recebido" fill="#10b981" radius={[6, 6, 0, 0]} barSize={28} />
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
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">📈 Acumulado no Ano</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">Gerado vs Recebido acumulado</p>
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
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} iconType="circle" />
                  <Area type="monotone" dataKey="Total Acumulado" fill="#dbeafe" stroke="#3b82f6" strokeWidth={2} />
                  <Area type="monotone" dataKey="Recebido Acumulado" fill="#d1fae5" stroke="#10b981" strokeWidth={2} />
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

            <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-slate-100 overflow-x-auto">
              {timeline.map((m) => {
                const isAtual = m.mes === mesSelecionado
                const isHoje = m.mes === mesAtualStr2
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
                    <div className="text-xl sm:text-2xl font-bold text-blue-900">R$ {fmt(dadosMes.total)}</div>
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

        {/* ── Ranking Corretores (master only) ── */}
        {usuario?.is_master && corretorFiltro === 'todos' && rankingCorretores.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 mb-6 sm:mb-8">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">🏆 Ranking de Corretores</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">Por comissão gerada no ano</p>
            </div>
            <div className="divide-y divide-slate-100">
              {rankingCorretores.map((c, idx) => (
                <div key={c.usuario_id} className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx === 0
                          ? 'bg-yellow-100 text-yellow-700'
                          : idx === 1
                          ? 'bg-slate-100 text-slate-600'
                          : idx === 2
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      {idx === 0 ? <Crown className="w-4 h-4" /> : idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{c.nome}</div>
                      <div className="text-xs text-slate-500">{c.propostas} proposta(s)</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-900">R$ {fmt(c.comissao)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Últimas Propostas */}
        {ultimasPropostas.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">📋 Últimas Propostas</h2>
              <Link href="/propostas" className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium">
                Ver todas →
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {ultimasPropostas.map((p) => (
                <div
                  key={p.id}
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
                    <div className="text-sm font-bold text-slate-900">R$ {fmt(p.comissao_total || 0)}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(p.data_proposta + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}