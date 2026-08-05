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

/* ── helpers ────────────────────────────────────────── */

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

  const supabase = createClient()

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

      /* ── Se master, busca lista de corretores ── */
      if (usuario.is_master) {
        const { data: usuarios } = await supabase
          .from('usuarios')
          .select('id, nome')
          .order('nome')

        if (usuarios) {
          setListaCorretores(usuarios)
          setTotalCorretores(usuarios.length)
        }
      }

      /* ── Query de propostas (filtrada ou não) ── */
      let query = supabase
        .from('propostas')
        .select('id, comissao_total, data_proposta, numero_proposta, nome_cliente, tipo_proposta_codigo, valor_contratado, usuario_id')
        .order('data_proposta', { ascending: false })

      // Usuário comum: só as dele
      if (!usuario.is_master) {
        query = query.eq('usuario_id', usuario.id)
      }
      // Master com filtro específico
      else if (corretorFiltro !== 'todos') {
        query = query.eq('usuario_id', corretorFiltro)
      }

      const { data: todas } = await query

      if (todas) {
        setUltimasPropostas(todas.slice(0, 5))

        // Propostas do mês
        const doMes = todas.filter((p) => (p.data_proposta as string)?.slice(0, 7) === mesAtualStr)
        setPropostasMes(doMes.length)

        // Comissão do ano
        const doAno = todas.filter((p) => (p.data_proposta as string)?.startsWith(String(anoAtual)))
        setComissaoAno(doAno.reduce((acc, p) => acc + (p.comissao_total || 0), 0))

        /* ── Ranking de corretores (master only) ── */
        if (usuario.is_master && corretorFiltro === 'todos') {
          const mapaCorretores: Record<string, CorretorResumo> = {}
          for (const p of todas) {
            const uid = p.usuario_id
            if (!mapaCorretores[uid]) {
              const corretor = listaCorretores.find((c) => c.id === uid)
              mapaCorretores[uid] = {
                usuario_id: uid,
                nome: corretor?.nome || 'Sem nome',
                propostas: 0,
                comissao: 0,
              }
            }
            // Só do ano atual pro ranking
            if ((p.data_proposta as string)?.startsWith(String(anoAtual))) {
              mapaCorretores[uid].propostas += 1
              mapaCorretores[uid].comissao += p.comissao_total || 0
            }
          }
          setRankingCorretores(
            Object.values(mapaCorretores).sort((a, b) => b.comissao - a.comissao)
          )
        }

        /* ── Timeline ── */
        const mapa: Record<string, ParcelaAgrupada> = {}

        for (const p of todas) {
          const mes = (p.data_proposta as string).slice(0, 7)
          if (!mapa[mes]) mapa[mes] = { mes, label: mesLabel(mes), total: 0, recebido: 0, qtd: 0 }
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
              if (!mapa[mesReceb]) mapa[mesReceb] = { mes: mesReceb, label: mesLabel(mesReceb), total: 0, recebido: 0, qtd: 0 }
              mapa[mesReceb].recebido += parcelaMensal
            }
          } else {
            const mesReceb = addMeses(mesBase, 1)
            if (!mapa[mesReceb]) mapa[mesReceb] = { mes: mesReceb, label: mesLabel(mesReceb), total: 0, recebido: 0, qtd: 0 }
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

  /* ── derivados ── */
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
      ? ((dadosMes.total - timeline[idxAtual - 1].total) / (timeline[idxAtual - 1].total || 1)) * 100
      : 0

  if (loading || loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Carregando dashboard...</div>
      </div>
    )
  }

  /* ── RENDER ───────────────────────────────────────── */

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* ── Header master ── */}
      {usuario?.is_master && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">Visão Master</p>
              <p className="text-xs text-amber-700">{totalCorretores} corretores cadastrados</p>
            </div>
          </div>

          <select
            value={corretorFiltro}
            onChange={(e) => setCorretorFiltro(e.target.value)}
            className="border border-amber-300 rounded-xl px-4 py-2 text-sm bg-white text-slate-700 focus:ring-2 focus:ring-amber-400 focus:outline-none"
          >
            <option value="todos">📊 Todos os corretores</option>
            {listaCorretores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome || c.id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── Cards KPI ── */}
      <div className={`grid gap-4 ${usuario?.is_master ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {usuario?.is_master && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Corretores Ativos</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalCorretores}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Propostas do Mês</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{propostasMes}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">A Receber em {proxMesLabel}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">R$ {fmt(aReceberProxMes)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Parcelas + comissões</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Comissão do Ano</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">R$ {fmt(comissaoAno)}</p>
          </div>
        </div>
      </div>

      {/* ── Ranking de corretores (master + "todos") ── */}
      {usuario?.is_master && corretorFiltro === 'todos' && rankingCorretores.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Ranking de Corretores — {new Date().getFullYear()}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Corretor</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Propostas</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {rankingCorretores.map((c, i) => (
                  <tr
                    key={c.usuario_id}
                    className={`border-b border-slate-50 hover:bg-slate-50 transition ${i === 0 ? 'bg-amber-50/50' : ''}`}
                  >
                    <td className="py-3 px-3 font-bold text-slate-400">
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

      {/* ── Gráfico Últimos 12 Meses ── */}
      {ultimos12.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">📈 Últimos 12 Meses</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={ultimos12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value: string) => <span className="text-slate-600">{value}</span>}
                />
                <Bar dataKey="total" name="Gerado" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={28} />
                <Line
                  dataKey="recebido"
                  name="Recebido"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Gráfico Acumulado ── */}
      {dadosAcumulados.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">📊 Evolução Acumulada</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dadosAcumulados}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  dataKey="Total Acumulado"
                  fill="#e0e7ff"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={0.3}
                />
                <Area
                  dataKey="Recebido Acumulado"
                  fill="#d1fae5"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={0.3}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Detalhamento mensal ── */}
      {dadosMes && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => mesAnterior && setMesSelecionado(mesAnterior)}
              disabled={!mesAnterior}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">{dadosMes.label}</h3>
              <p className="text-xs text-slate-500">{dadosMes.qtd} propostas</p>
            </div>
            <button
              onClick={() => mesProximo && setMesSelecionado(mesProximo)}
              disabled={!mesProximo}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 rounded-xl p-4 text-center">
              <p className="text-xs text-indigo-600 font-medium">Gerado</p>
              <p className="text-xl font-bold text-indigo-900 mt-1">R$ {fmt(dadosMes.total)}</p>
              {variacao !== 0 && (
                <p className={`text-xs mt-1 flex items-center justify-center gap-1 ${variacao >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {variacao >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(variacao).toFixed(1)}% vs anterior
                </p>
              )}
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <p className="text-xs text-emerald-600 font-medium">Recebido</p>
              <p className="text-xl font-bold text-emerald-900 mt-1">R$ {fmt(dadosMes.recebido)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Últimas Propostas ── */}
      {ultimasPropostas.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">📋 Últimas Propostas</h2>
            <Link href="/propostas" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              Ver todas →
            </Link>
          </div>
          <div className="space-y-3">
            {ultimasPropostas.map((p) => (
              <Link
                key={p.id}
                href={`/propostas/${p.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition border border-slate-100"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{p.nome_cliente}</p>
                  <p className="text-xs text-slate-500">
                    Nº {p.numero_proposta} · {p.tipo_proposta_codigo}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-bold text-emerald-600">R$ {fmt(p.comissao_total || 0)}</p>
                  <p className="text-xs text-slate-400">{p.data_proposta}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}