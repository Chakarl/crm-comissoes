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
  CheckCircle2,
  Clock,
} from 'lucide-react'

interface ParcelaAgrupada {
  mes: string            // "2026-01"
  label: string          // "Jan/2026"
  total: number
  pago: number
  pendente: number
  qtd: number
  parcelas: any[]
}

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function mesLabel(iso: string) {
  const [ano, m] = iso.split('-')
  return `${MESES_PT[parseInt(m) - 1]}/${ano}`
}

export default function DashboardPage() {
  const [totalPropostas, setTotalPropostas] = useState(0)
  const [comissaoMes, setComissaoMes] = useState(0)
  const [comissaoTotal, setComissaoTotal] = useState(0)
  const [ultimasPropostas, setUltimasPropostas] = useState<any[]>([])
  const [timeline, setTimeline] = useState<ParcelaAgrupada[]>([])
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadDashboard() }, [])

  const loadDashboard = async () => {
    try {
      // Propostas
      const { data: todas } = await supabase
        .from('propostas')
        .select('id, comissao_total, data_proposta, numero_proposta, nome_cliente, tipo_proposta_codigo, valor_contratado')
        .order('data_proposta', { ascending: false })

      if (todas) {
        setTotalPropostas(todas.length)
        setUltimasPropostas(todas.slice(0, 5))
        const total = todas.reduce((acc, p) => acc + (p.comissao_total || 0), 0)
        setComissaoTotal(total)

        const now = new Date()
        const mesAtual = todas.filter(p => {
          const d = new Date(p.data_proposta)
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        })
        setComissaoMes(mesAtual.reduce((acc, p) => acc + (p.comissao_total || 0), 0))
      }

      // Parcelas com dados da proposta
      const { data: parcelas } = await supabase
        .from('parcelas_comissao')
        .select('*, propostas(numero_proposta, nome_cliente, tipo_proposta_codigo)')
        .order('mes_referencia', { ascending: true })

      if (parcelas && parcelas.length > 0) {
        // Agrupar por mês
        const mapa: Record<string, ParcelaAgrupada> = {}

        for (const p of parcelas) {
          const mes = (p.mes_referencia as string).slice(0, 7) // "2026-08"
          if (!mapa[mes]) {
            mapa[mes] = { mes, label: mesLabel(mes), total: 0, pago: 0, pendente: 0, qtd: 0, parcelas: [] }
          }
          const valor = parseFloat(p.valor)
          mapa[mes].total += valor
          mapa[mes].qtd += 1
          if (p.pago) mapa[mes].pago += valor
          else mapa[mes].pendente += valor
          mapa[mes].parcelas.push(p)
        }

        const lista = Object.values(mapa).sort((a, b) => a.mes.localeCompare(b.mes))
        setTimeline(lista)

        // Selecionar mês atual por padrão
        const now = new Date()
        const mesAtualStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        setMesSelecionado(lista.find(m => m.mes === mesAtualStr)?.mes || lista[0]?.mes || null)
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  // Marcar parcela como paga/não paga
  const togglePago = async (parcelaId: string, pagoAtual: boolean) => {
    const { error } = await supabase
      .from('parcelas_comissao')
      .update({ pago: !pagoAtual })
      .eq('id', parcelaId)

    if (!error) loadDashboard()
  }

  // Navegação entre meses
  const idxAtual = timeline.findIndex(m => m.mes === mesSelecionado)
  const mesAnterior = idxAtual > 0 ? timeline[idxAtual - 1].mes : null
  const mesProximo = idxAtual < timeline.length - 1 ? timeline[idxAtual + 1].mes : null
  const dadosMes = timeline.find(m => m.mes === mesSelecionado)

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Carregando dashboard...</div>
      </div>
    )
  }

  const cards = [
    { title: 'Total de Propostas', value: totalPropostas, icon: FileText, color: 'bg-blue-500' },
    { title: 'Comissões do Mês', value: `R$ ${fmt(comissaoMes)}`, icon: Calendar, color: 'bg-amber-500' },
    { title: 'Comissão Total', value: `R$ ${fmt(comissaoTotal)}`, icon: DollarSign, color: 'bg-emerald-500' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
          <p className="text-slate-600">Visão geral do sistema</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.title} className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div className={`${card.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{card.value}</div>
                <div className="text-slate-600 text-sm font-medium">{card.title}</div>
              </div>
            )
          })}
        </div>

        {/* Timeline Comissões por Mês */}
        {timeline.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 mb-8">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">📅 Comissões por Mês</h2>
              <p className="text-sm text-slate-500 mt-1">Parcelas de consórcio e outros produtos parcelados</p>
            </div>

            {/* Barra de meses */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 overflow-x-auto">
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
                      flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isAtual
                        ? 'bg-blue-600 text-white'
                        : isHoje
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }
                    `}
                  >
                    {m.label}
                    {m.pendente > 0 && !isAtual && (
                      <span className="ml-1.5 inline-block w-2 h-2 bg-amber-400 rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Resumo do mês selecionado */}
            {dadosMes && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => mesAnterior && setMesSelecionado(mesAnterior)}
                    disabled={!mesAnterior}
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="text-center">
                    <div className="text-xl font-bold text-slate-900">{dadosMes.label}</div>
                    <div className="text-sm text-slate-500">{dadosMes.qtd} parcela{dadosMes.qtd !== 1 ? 's' : ''}</div>
                  </div>

                  <button
                    onClick={() => mesProximo && setMesSelecionado(mesProximo)}
                    disabled={!mesProximo}
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Mini cards do mês */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <div className="text-sm text-slate-500 mb-1">Total</div>
                    <div className="text-lg font-bold text-slate-900">R$ {fmt(dadosMes.total)}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-sm text-green-600 mb-1">Recebido</div>
                    <div className="text-lg font-bold text-green-700">R$ {fmt(dadosMes.pago)}</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 text-center">
                    <div className="text-sm text-amber-600 mb-1">Pendente</div>
                    <div className="text-lg font-bold text-amber-700">R$ {fmt(dadosMes.pendente)}</div>
                  </div>
                </div>

                {/* Lista de parcelas */}
                <div className="space-y-2">
                  {dadosMes.parcelas.map((p: any) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        p.pago
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => togglePago(p.id, p.pago)}
                          className={`p-1 rounded-full transition-colors ${
                            p.pago
                              ? 'text-green-600 hover:text-green-700'
                              : 'text-slate-300 hover:text-slate-500'
                          }`}
                          title={p.pago ? 'Marcar como pendente' : 'Marcar como recebido'}
                        >
                          {p.pago
                            ? <CheckCircle2 className="w-5 h-5" />
                            : <Clock className="w-5 h-5" />
                          }
                        </button>
                        <div>
                          <div className="font-medium text-slate-900 text-sm">
                            {p.propostas?.nome_cliente || 'Cliente'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {p.propostas?.numero_proposta} · {p.propostas?.tipo_proposta_codigo} · Parcela {p.numero_parcela}
                          </div>
                        </div>
                      </div>
                      <div className={`font-semibold ${p.pago ? 'text-green-600' : 'text-slate-900'}`}>
                        R$ {fmt(parseFloat(p.valor))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Últimas propostas */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Últimas Propostas</h2>
            <Link href="/propostas" className="text-blue-600 hover:underline text-sm font-medium">
              Ver todas →
            </Link>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Número</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Cliente</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Tipo</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Valor</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {ultimasPropostas.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{p.numero_proposta}</td>
                  <td className="px-6 py-3 text-slate-700">{p.nome_cliente}</td>
                  <td className="px-6 py-3 text-slate-700">{p.tipo_proposta_codigo}</td>
                  <td className="px-6 py-3 text-slate-700">
                    R$ {p.valor_contratado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3 font-semibold text-green-600">
                    R$ {p.comissao_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {ultimasPropostas.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma proposta cadastrada ainda</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}