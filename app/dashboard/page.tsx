'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { FileText, DollarSign, TrendingUp, Calendar } from 'lucide-react'

export default function DashboardPage() {
  const [totalPropostas, setTotalPropostas] = useState(0)
  const [comissaoMes, setComissaoMes] = useState(0)
  const [comissaoTotal, setComissaoTotal] = useState(0)
  const [ultimasPropostas, setUltimasPropostas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      // Total de propostas
      const { data: todas } = await supabase
        .from('propostas')
        .select('id, comissao_total, data_proposta, numero_proposta, nome_cliente, tipo_proposta_codigo, valor_contratado')
        .order('data_proposta', { ascending: false })

      if (todas) {
        setTotalPropostas(todas.length)
        setUltimasPropostas(todas.slice(0, 5))

        // Comissão total
        const total = todas.reduce((acc, p) => acc + (p.comissao_total || 0), 0)
        setComissaoTotal(total)

        // Comissão do mês atual
        const now = new Date()
        const mesAtual = todas.filter(p => {
          const d = new Date(p.data_proposta)
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        })
        const totalMes = mesAtual.reduce((acc, p) => acc + (p.comissao_total || 0), 0)
        setComissaoMes(totalMes)
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Carregando dashboard...</div>
      </div>
    )
  }

  const cards = [
    {
      title: 'Total de Propostas',
      value: totalPropostas,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      title: 'Comissões do Mês',
      value: `R$ ${comissaoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: Calendar,
      color: 'bg-amber-500',
    },
    {
      title: 'Comissão Total',
      value: `R$ ${comissaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'bg-emerald-500',
    },
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