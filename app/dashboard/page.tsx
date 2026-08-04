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

function addMeses(mesStr: string, qtd: number): string {
  const [ano, mes] = mesStr.split('-').map(Number)
  const d = new Date(ano, mes - 1 + qtd, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
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

        // Timeline com parcelamento correto
        const mapa: Record<string, ParcelaAgrupada> = {}

        // 1. Total gerado no mês (todas as comissões fechadas)
        for (const p of todas) {
          const mes = (p.data_proposta as string).slice(0, 7)
          if (!mapa[mes]) {
            mapa[mes] = { mes, label: mesLabel(mes), total: 0, recebido: 0, qtd: 0 }
          }
          const valor = p.comissao_total || 0
          mapa[mes].total += valor
          mapa[mes].qtd += 1
        }

        // 2. Recebido (considerando parcelamento)
        for (const p of todas) {
          const mesBase = (p.data_proposta as string).slice(0, 7)
          const valor = p.comissao_total || 0
          const tipo = p.tipo_proposta_codigo?.toLowerCase() || ''

          if (tipo.includes('consorcio') || tipo.includes('consórcio')) {
            // Consórcio: divide em 5 parcelas, começa no mês seguinte
            const parcelaMensal = valor / 5
            for (let i = 1; i <= 5; i++) {
              const mesRecebimento = addMeses(mesBase, i)
              if (!mapa[mesRecebimento]) {
                mapa[mesRecebimento] = { mes: mesRecebimento, label: mesLabel(mesRecebimento), total: 0, recebido: 0, qtd: 0 }
              }
              mapa[mesRecebimento].recebido += parcelaMensal
            }
          } else {
            // Outros produtos: recebe integralmente no mês seguinte
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
                Total gerado no mês • Recebido do mês anterior
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
                  {/* Total Gerado */}
                  <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Total Gerado</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">
                      R$ {fmt(dadosMes.total)}
                    </div>
                    <div className="text-xs sm:text-sm text-blue-700">
                      {dadosMes.qtd} proposta(s) fechada(s)
                    </div>
                  </div>

                  {/* Recebido */}
                  <div className="bg-green-50 rounded-xl p-4 sm:p-6 border border-green-100">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Recebido (mês anterior)</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">
                      R$ {fmt(dadosMes.recebido)}
                    </div>
                    <div className="text-xs sm:text-sm text-green-700">
                      Pagamento referente ao mês anterior
                    </div>
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
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                5 propostas cadastradas mais recentemente
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {ultimasPropostas.map((p) => (
                <Link
                  key={p.id}
                  href={`/propostas/${p.id}/editar`}
                  className="block px-4 sm:px-6 py-3 sm:py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">{p.numero_proposta}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                          {p.tipo_proposta_codigo}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 truncate">{p.nome_cliente}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-slate-900">
                        R$ {(p.valor_contratado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(p.data_proposta + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
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