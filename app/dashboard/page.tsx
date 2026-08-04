'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  FileText,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'

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

      // Propostas
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
      }

      // Timeline de parcelas/propostas por mês
      const { data: propostas } = await supabase
        .from('propostas')
        .select('data_proposta, comissao_total')
        .order('data_proposta', { ascending: true })

      if (propostas && propostas.length > 0) {
        const mapa: Record<string, ParcelaAgrupada> = {}

        // Agrupar comissões por mês de fechamento da proposta
        for (const p of propostas) {
          const mes = (p.data_proposta as string).slice(0, 7) // "2026-08"
          if (!mapa[mes]) {
            mapa[mes] = { mes, label: mesLabel(mes), total: 0, recebido: 0, qtd: 0 }
          }
          const valor = p.comissao_total || 0
          mapa[mes].total += valor
          mapa[mes].qtd += 1
        }

        const lista = Object.values(mapa).sort((a, b) => a.mes.localeCompare(b.mes))

        // Calcular "Recebido" = Total gerado do mês anterior
        for (let i = 1; i < lista.length; i++) {
          lista[i].recebido = lista[i - 1].total
        }

        setTimeline(lista)

        const mesAtualStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`
        setMesSelecionado(lista.find((m) => m.mes === mesAtualStr)?.mes || lista[lista.length - 1]?.mes || null)
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

        {/* Timeline Comissões */}
        {timeline.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 mb-6 sm:mb-8">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">📅 Comissões por Mês</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Total gerado no mês e recebido do mês anterior
              </p>
            </div>

            {/* Barra de meses */}
            <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-slate-100 overflow-x-auto">
              {timeline.map((m) => {
                const isAtual = m.mes === mesSelecionado
                const now = new Date()
                const mesAtualStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-xs sm:text-sm text-blue-700 font-medium mb-1">Total Gerado</div>
                    <div className="text-xl sm:text-2xl font-bold text-blue-900">R$ {fmt(dadosMes.total)}</div>
                    <div className="text-xs text-blue-600 mt-1">{dadosMes.qtd} proposta(s)</div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-xs sm:text-sm text-green-700 font-medium mb-1">Recebido (mês anterior)</div>
                    <div className="text-xl sm:text-2xl font-bold text-green-900">R$ {fmt(dadosMes.recebido)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Últimas Propostas */}
        {ultimasPropostas.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">📋 Últimas Propostas</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">5 propostas mais recentes</p>
            </div>

            {/* Desktop - Tabela */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700">Número</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700">Cliente</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700">Tipo</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700">Data</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-700">Valor</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-700">Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimasPropostas.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-3 text-sm font-medium text-slate-900">{p.numero_proposta}</td>
                      <td className="px-6 py-3 text-sm text-slate-700">{p.nome_cliente}</td>
                      <td className="px-6 py-3 text-sm text-slate-700">{p.tipo_proposta_codigo}</td>
                      <td className="px-6 py-3 text-sm text-slate-700">
                        {new Date(p.data_proposta + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-700 text-right">
                        R$ {p.valor_contratado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-green-600 text-right">
                        R$ {p.comissao_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile - Cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {ultimasPropostas.map((p) => (
                <div key={p.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{p.numero_proposta}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{p.nome_cliente}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">
                      {p.tipo_proposta_codigo}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 mt-3">
                    <span>{new Date(p.data_proposta + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    <span className="font-medium">
                      R$ {p.valor_contratado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-xs text-slate-500">Comissão: </span>
                    <span className="text-sm font-bold text-green-600">
                      R$ {p.comissao_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </span>
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