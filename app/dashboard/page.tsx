'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useUsuario } from '@/hooks/useUsuario'
import Link from 'next/link'
import {
  FileText,
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

/* ── tipos ──────────────────────────────────────────── */

interface ParcelaAgrupada {
  mes: string
  label: string
  total: number
  recebido: number
  qtd: number
}

interface CorretorResumo {
  usuario_id: string
  nome: string
  propostas: number
  comissao: number
}

/* ── helpers ────────────────────────────────────────── */

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

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

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

/* ── componente principal ───────────────────────────── */

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
  const [rankingCorretores, setRankingCorretores] = useState<CorretorResumo[]>([])
  const [corretorFiltro, setCorretorFiltro] = useState<string>('todos')
  const [listaCorretores, setListaCorretores] = useState<{ id: string; nome: string }[]>([])

  useEffect(() => {
    if (!loadingUser && usuario) loadDashboard()
  }, [loadingUser, usuario, corretorFiltro])

  /* ── carrega tudo ─────────────────────────────────── */

  const loadDashboard = async () => {
    if (!usuario) return
    setLoading(true)

    try {
      const now = new Date()
      const anoAtual = now.getFullYear()
      const mesAtual = now.getMonth()
      const mesAtualStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`
      const proxMesStr = addMeses(mesAtualStr, 1)

      /* ── corretores (master only) ── */
      let corretoresLocal: { id: string; nome: string }[] = []

      if (usuario.is_master) {
        const { data: usuarios } = await supabase
          .from('usuarios')
          .select('id, nome')
          .eq('is_master', false)
          .order('nome')

        if (usuarios) {
          corretoresLocal = usuarios
          setListaCorretores(usuarios)
          setTotalCorretores(usuarios.length)
        }
      }

      /* ── propostas ── */
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

        /* propostas do mês */
        const doMes = todas.filter(
          (p) => (p.data_proposta as string)?.slice(0, 7) === mesAtualStr
        )
        setPropostasMes(doMes.length)

        /* comissão do ano */
        const doAno = todas.filter((p) =>
          (p.data_proposta as string)?.startsWith(String(anoAtual))
        )
        setComissaoAno(doAno.reduce((acc, p) => acc + (p.comissao_total || 0), 0))

        /* ── ranking corretores (master, visão "todos") ── */
        if (usuario.is_master && corretorFiltro === 'todos') {
          const mapaCorretores: Record<string, CorretorResumo> = {}
          for (const p of todas) {
            const uid = p.usuario_id
            if (!mapaCorretores[uid]) {
              const corretor = corretoresLocal.find((c) => c.id === uid)
              mapaCorretores[uid] = {
                usuario_id: uid,
                nome: corretor?.nome || 'Sem nome',
                propostas: 0,
                comissao: 0,
              }
            }
            if ((p.data_proposta as string)?.startsWith(String(anoAtual))) {
              mapaCorretores[uid].propostas += 1
              mapaCorretores[uid].comissao += p.comissao_total || 0
            }
          }
          setRankingCorretores(
            Object.values(mapaCorretores).sort((a, b) => b.comissao - a.comissao)
          )
        }

        /* ── timeline ── */
        const mapa: Record<string, ParcelaAgrupada> = {}

        for (const p of todas) {
          const mes = (p.data_proposta as string).slice(0, 7)
          if (!mapa[mes])
            mapa[mes] = { mes, label: mesLabel(mes), total: 0, recebido: 0, qtd: 0 }
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
              const mesReceb = addMeses(mesBase, i)
              if (!mapa[mesReceb])
                mapa[mesReceb] = {
                  mes: mesReceb,
                  label: mesLabel(mesReceb),
                  total: 0,
                  recebido: 0,
                  qtd: 0,
                }
              mapa[mesReceb].recebido += parcelaMensal
            }
          } else {
            const mesReceb = addMeses(mesBase, 1)
            if (!mapa[mesReceb])
              mapa[mesReceb] = {
                mes: mesReceb,
                label: mesLabel(mesReceb),
                total: 0,
                recebido: 0,
                qtd: 0,
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

  /* ── derivados ────────────────────────────────────── */

  const idxAtual = timeline.findIndex((m) => m.mes === mesSelecionado)
  const mesAnterior = idxAtual > 0 ? timeline[idxAtual - 1].mes : null
  const mesProximo = idxAtual < timeline.length - 1 ? timeline[idxAtual + 1].mes : null
  const dadosMes = timeline.find((m) => m.mes === mesSelecionado)

  const now2 = new Date()
  const mesAtualStr2 = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}`
  const proxMesLabel = mesLabel(addMeses(mesAtualStr2, 1))

  const ultimos12 = timeline
    .filter((m) => m.mes <= mesAtualStr2)
    .slice(-12)
    .map((m) => ({ ...m, totalFormatado: m.total, recebidoFormatado: m.recebido }))

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
      ? ((dadosMes.total - timeline[idxAtual - 1].total) /
          (timeline[idxAtual - 1].total || 1)) *
        100
      : 0

  /* ── loading ──────────────────────────────────────── */

  if (loading || loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Carregando dashboard...</div>
      </div>
    )
  }

  /* ── cards ────────────────────────────────────────── */

  const cards = usuario?.is_master
    ? [
        {
          title: 'Corretores Ativos',
          value: totalCorretores,
          icon: Users,
          color: 'bg-indigo-500',
          subtitle: 'Usuários cadastrados',
        },
        {
          title: 'Propostas do Mês',
          value: propostasMes,
          icon: FileText,
          color: 'bg-blue-500',
          subtitle: corretorFiltro === 'todos' ? 'Todos os corretores' : 'Corretor selecionado',
        },
        {
          title: `A Receber em ${proxMesLabel}`,
          value: `R$ ${fmt(aReceberProxMes)}`,
          icon: DollarSign,
          color: 'bg-violet-500',
          subtitle: 'Parcelas consórcio + comissões',
        },
        {
          title: 'Comissão do Ano',
          value: `R$ ${fmt(comissaoAno)}`,
          icon: TrendingUp,
          color: 'bg-emerald-500',
          subtitle: corretorFiltro === 'todos' ? 'Total da equipe' : 'Corretor selecionado',
        },
      ]
    : [
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

  /* ── render ───────────────────────────────────────── */

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* ── header + filtro master ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {usuario?.is_master && <Crown className="w-6 h-6 text-amber-500" />}
            Dashboard {usuario?.is_master ? 'Master' : ''}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {usuario?.is_master
              ? 'Visão geral de todos os corretores'
              : 'Sua visão geral de desempenho'}
          </p>
        </div>

        {usuario?.is_master && (
          <select
            value={corretorFiltro}
            onChange={(e) => setCorretorFiltro(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white shadow-sm"
          >
            <option value="todos">👥 Todos os Corretores</option>
            {listaCorretores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── cards ── */}
      <div className={`grid gap-4 ${usuario?.is_master ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">{card.title}</span>
              <div className={`${card.color} p-2 rounded-xl`}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{card.value}</div>
            {card.subtitle && (
              <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
            )}
          </div>
        ))}
      </div>

      {/* ── ranking corretores (master only, visão "todos") ── */}
      {usuario?.is_master && corretorFiltro === 'todos' && rankingCorretores.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Ranking de Corretores — {new Date().getFullYear()}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">#</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Corretor</th>
                  <th className="text-center py-2 px-3 text-slate-500 font-medium">Propostas</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {rankingCorretores.map((c, i) => (
                  <tr
                    key={c.usuario_id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-3">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900">{c.nome}</td>
                    <td className="py-3 px-3 text-center text-slate-600">{c.propostas}</td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                      R$ {fmt(c.comissao)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── navegação mensal ── */}
      {dadosMes && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => mesAnterior && setMesSelecionado(mesAnterior)}
              disabled={!mesAnterior}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-900">{dadosMes.label}</h2>
              <p className="text-xs text-slate-500">{dadosMes.qtd} propostas no mês</p>
            </div>
            <button
              onClick={() => mesProximo && setMesSelecionado(mesProximo)}
              disabled={!mesProximo}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-xs text-blue-600 font-medium mb-1">Comissão Gerada</p>
              <p className="text-xl font-bold text-blue-700">R$ {fmt(dadosMes.total)}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <p className="text-xs text-emerald-600 font-medium mb-1">Recebido</p>
              <p className="text-xl font-bold text-emerald-700">R$ {fmt(dadosMes.recebido)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-600 font-medium mb-1">Variação</p>
              <div className="flex items-center justify-center gap-1">
                {variacao >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
                <p
                  className={`text-xl font-bold ${variacao >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {variacao.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── gráfico mensal ── */}
      {ultimos12.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-lg font-bold text-slate-900 mb-4">📊 Comissão × Recebido (12 meses)</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={ultimos12} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  iconType="circle"
                />
                <Bar dataKey="total" name="Comissão Gerada" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={28} />
                <Line
                  dataKey="recebido"
                  name="Recebido"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                  type="monotone"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── gráfico acumulado ── */}
      {dadosAcumulados.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-lg font-bold text-slate-900 mb-4">📈 Evolução Acumulada</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dadosAcumulados} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  iconType="circle"
                />
                <Area
                  dataKey="Total Acumulado"
                  fill="#3b82f620"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  type="monotone"
                />
                <Area
                  dataKey="Recebido Acumulado"
                  fill="#10b98120"
                  stroke="#10b981"
                  strokeWidth={2}
                  type="monotone"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── últimas propostas ── */}
      {ultimasPropostas.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">📋 Últimas Propostas</h2>
            <Link
              href="/propostas"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver todas →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Nº</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Cliente</th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">Data</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Valor</th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {ultimasPropostas.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-3 font-medium text-slate-900">
                      {p.numero_proposta || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{p.nome_cliente || '—'}</td>
                    <td className="py-3 px-3 text-slate-500">
                      {p.data_proposta
                        ? new Date(p.data_proposta + 'T00:00:00').toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      R$ {fmt(p.valor_contratado || 0)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                      R$ {fmt(p.comissao_total || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}