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

const MESES_PT = [
  'Jan','Fev','Mar','Abr','Mai','Jun',
  'Jul','Ago','Set','Out','Nov','Dez',
]

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

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

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
  const [listaCorretores, setListaCorretores] = useState<
    { id: string; nome: string }[]
  >([])

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

      /* ───────────────────────────────────────────────
         MAPA DE TODOS OS USUÁRIOS (para resolver nomes)
         + lista de corretores não-master (para dropdown)
      ─────────────────────────────────────────────── */
      let todosUsuarios: { id: string; nome: string; is_master: boolean }[] = []
      let corretoresDropdown: { id: string; nome: string }[] = []

      if (usuario.is_master) {
        const { data: usuarios } = await supabase
          .from('usuarios')
          .select('id, nome, is_master')
          .order('nome')

        if (usuarios) {
          todosUsuarios = usuarios

          // Dropdown: só não-master
          corretoresDropdown = usuarios
            .filter((u) => !u.is_master)
            .map((u) => ({ id: u.id, nome: u.nome || 'Sem nome' }))

          setListaCorretores(corretoresDropdown)
          setTotalCorretores(corretoresDropdown.length)
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
        setComissaoAno(
          doAno.reduce((acc, p) => acc + (p.comissao_total || 0), 0)
        )

        /* ── ranking (master, visão "todos") ── */
        if (usuario.is_master && corretorFiltro === 'todos') {
          const mapaCorretores: Record<string, CorretorResumo> = {}
          for (const p of todas) {
            const uid = p.usuario_id
            if (!mapaCorretores[uid]) {
              // Busca nome no mapa completo (inclui masters)
              const usr = todosUsuarios.find((u) => u.id === uid)
              mapaCorretores[uid] = {
                usuario_id: uid,
                nome: usr?.nome || 'Desconhecido',
                propostas: 0,
                comissao: 0,
              }
            }
            if (
              (p.data_proposta as string)?.startsWith(String(anoAtual))
            ) {
              mapaCorretores[uid].propostas += 1
              mapaCorretores[uid].comissao += p.comissao_total || 0
            }
          }
          setRankingCorretores(
            Object.values(mapaCorretores).sort(
              (a, b) => b.comissao - a.comissao
            )
          )
        }

        /* ── timeline ── */
        const mapa: Record<string, ParcelaAgrupada> = {}

        for (const p of todas) {
          const mes = (p.data_proposta as string).slice(0, 7)
          if (!mapa[mes])
            mapa[mes] = {
              mes,
              label: mesLabel(mes),
              total: 0,
              recebido: 0,
              qtd: 0,
            }
          mapa[mes].total += p.comissao_total || 0
          mapa[mes].qtd += 1
        }

        for (const p of todas) {
          const mesBase = (p.data_proposta as string).slice(0, 7)
          const valor = p.comissao_total || 0
          const tipo = p.tipo_proposta_codigo?.toLowerCase() || ''

          if (
            tipo.includes('consorcio') ||
            tipo.includes('consórcio')
          ) {
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

        const lista = Object.values(mapa).sort((a, b) =>
          a.mes.localeCompare(b.mes)
        )
        setTimeline(lista)

        const dadosProxMes = lista.find((m) => m.mes === proxMesStr)
        setAReceberProxMes(dadosProxMes?.recebido || 0)

        if (!mesSelecionado) {
          setMesSelecionado(mesAtualStr)
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  /* ── navegação mensal ─────────────────────────────── */

  const dadosMesSelecionado = timeline.find(
    (t) => t.mes === mesSelecionado
  )

  const idxMes = timeline.findIndex((t) => t.mes === mesSelecionado)

  const mesAnteriorData =
    idxMes > 0 ? timeline[idxMes - 1] : null

  const variacao =
    dadosMesSelecionado && mesAnteriorData && mesAnteriorData.total > 0
      ? (
          ((dadosMesSelecionado.total - mesAnteriorData.total) /
            mesAnteriorData.total) *
          100
        ).toFixed(1)
      : null

  const navegarMes = (dir: 'prev' | 'next') => {
    if (dir === 'prev' && idxMes > 0)
      setMesSelecionado(timeline[idxMes - 1].mes)
    if (dir === 'next' && idxMes < timeline.length - 1)
      setMesSelecionado(timeline[idxMes + 1].mes)
  }

  /* ── loading / sem usuário ────────────────────────── */

  if (loadingUser || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!usuario) {
    return (
      <div className="text-center py-12 text-slate-500">
        Usuário não encontrado.
      </div>
    )
  }

  const isMaster = usuario.is_master

  /* ── render ───────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {isMaster && <Crown className="w-6 h-6 text-amber-500" />}
            {isMaster ? 'Dashboard Master' : 'Dashboard'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isMaster
              ? 'Visão geral de todos os corretores'
              : 'Suas comissões e propostas'}
          </p>
        </div>

        {/* Dropdown corretor (master only) */}
        {isMaster && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <select
              value={corretorFiltro}
              onChange={(e) => setCorretorFiltro(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      </div>

      {/* ── Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card: Corretores (master) ou Propostas totais (comum) */}
        {isMaster ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">Corretores Ativos</span>
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {totalCorretores}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Usuários cadastrados
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">Total Propostas</span>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {ultimasPropostas.length > 0
                ? timeline.reduce((a, t) => a + t.qtd, 0)
                : 0}
            </p>
            <p className="text-xs text-slate-400 mt-1">Desde o início</p>
          </div>
        )}

        {/* Card: Propostas do Mês */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Propostas do Mês</span>
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{propostasMes}</p>
          <p className="text-xs text-slate-400 mt-1">
            {isMaster ? 'Todos os corretores' : 'Neste mês'}
          </p>
        </div>

        {/* Card: A Receber */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">
              A Receber em{' '}
              {MESES_PT[new Date().getMonth() + 1 > 11 ? 0 : new Date().getMonth() + 1]}/
              {new Date().getMonth() + 1 > 11
                ? new Date().getFullYear() + 1
                : new Date().getFullYear()}
            </span>
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            R$ {fmt(aReceberProxMes)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Parcelas consórcio + comissões
          </p>
        </div>

        {/* Card: Comissão do Ano */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Comissão do Ano</span>
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            R$ {fmt(comissaoAno)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {isMaster ? 'Total da equipe' : 'Acumulado no ano'}
          </p>
        </div>
      </div>

      {/* ── Ranking de Corretores (master, visão todos) ── */}
      {isMaster && corretorFiltro === 'todos' && rankingCorretores.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Ranking de Corretores — {new Date().getFullYear()}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs uppercase border-b border-slate-100">
                  <th className="text-left py-3 px-2 w-12">#</th>
                  <th className="text-left py-3 px-2">Corretor</th>
                  <th className="text-center py-3 px-2">Propostas</th>
                  <th className="text-right py-3 px-2">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {rankingCorretores.map((c, idx) => (
                  <tr
                    key={c.usuario_id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition"
                  >
                    <td className="py-3 px-2">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </td>
                    <td className="py-3 px-2 font-medium text-slate-900">
                      {c.nome}
                    </td>
                    <td className="py-3 px-2 text-center text-slate-600">
                      {c.propostas}
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-green-600">
                      R$ {fmt(c.comissao)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Navegação mensal ── */}
      {timeline.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navegarMes('prev')}
              disabled={idxMes <= 0}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">
                {dadosMesSelecionado?.label || '—'}
              </h3>
              <p className="text-sm text-slate-400">
                {dadosMesSelecionado?.qtd || 0} propostas no mês
              </p>
            </div>
            <button
              onClick={() => navegarMes('next')}
              disabled={idxMes >= timeline.length - 1}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-xs text-blue-600 font-medium mb-1">
                Comissão Gerada
              </p>
              <p className="text-xl font-bold text-blue-700">
                R$ {fmt(dadosMesSelecionado?.total || 0)}
              </p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-xs text-green-600 font-medium mb-1">
                Recebido
              </p>
              <p className="text-xl font-bold text-green-700">
                R$ {fmt(dadosMesSelecionado?.recebido || 0)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 font-medium mb-1">
                Variação
              </p>
              {variacao !== null ? (
                <p
                  className={`text-xl font-bold flex items-center justify-center gap-1 ${
                    parseFloat(variacao) >= 0
                      ? 'text-green-600'
                      : 'text-red-500'
                  }`}
                >
                  {parseFloat(variacao) >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {variacao}%
                </p>
              ) : (
                <p className="text-xl font-bold text-slate-300">—</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Gráfico ── */}
      {timeline.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            📊 Evolução de Comissões
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <YAxis
                  tickFormatter={formatCurrencyShort}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
                />
                <Area
                  type="monotone"
                  dataKey="recebido"
                  name="Recebido"
                  fill="#dcfce7"
                  stroke="#22c55e"
                  strokeWidth={2}
                />
                <Bar
                  dataKey="total"
                  name="Comissão Gerada"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                  barSize={32}
                />
                <Line
                  type="monotone"
                  dataKey="recebido"
                  name="Recebido (linha)"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#22c55e' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Últimas propostas ── */}
      {ultimasPropostas.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              📋 Últimas Propostas
            </h2>
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
                <tr className="text-slate-400 text-xs uppercase border-b border-slate-100">
                  <th className="text-left py-3 px-2">Nº</th>
                  <th className="text-left py-3 px-2">Cliente</th>
                  <th className="text-left py-3 px-2">Tipo</th>
                  <th className="text-right py-3 px-2">Valor</th>
                  <th className="text-right py-3 px-2">Comissão</th>
                  <th className="text-right py-3 px-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {ultimasPropostas.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition"
                  >
                    <td className="py-3 px-2 font-medium text-slate-900">
                      {p.numero_proposta}
                    </td>
                    <td className="py-3 px-2 text-slate-700">
                      {p.nome_cliente}
                    </td>
                    <td className="py-3 px-2 text-slate-500">
                      {p.tipo_proposta_codigo}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-700">
                      R$ {fmt(p.valor_contratado || 0)}
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-green-600">
                      R$ {fmt(p.comissao_total || 0)}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-400">
                      {new Date(p.data_proposta).toLocaleDateString('pt-BR')}
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