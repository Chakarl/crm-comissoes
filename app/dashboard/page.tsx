'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { TrendingUp, DollarSign, FileText, Users } from 'lucide-react'

const supabase = createClient()

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalPropostas: 0,
    valorTotal: 0,
    comissaoTotal: 0,
    totalClientes: 0,
  })

  useEffect(() => {
    async function loadStats() {
      const [propostas, clientes] = await Promise.all([
        supabase.from('propostas').select('valor_contratado, comissao_total'),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
      ])

      const totalPropostas = propostas.data?.length || 0
      const valorTotal = propostas.data?.reduce((s, p) => s + (p.valor_contratado || 0), 0) || 0
      const comissaoTotal = propostas.data?.reduce((s, p) => s + (p.comissao_total || 0), 0) || 0
      const totalClientes = clientes.count || 0

      setStats({ totalPropostas, valorTotal, comissaoTotal, totalClientes })
    }
    loadStats()
  }, [])

  const cards = [
    {
      label: 'Total de Propostas',
      value: stats.totalPropostas.toString(),
      icon: FileText,
      color: 'blue',
    },
    {
      label: 'Valor Total Contratado',
      value: stats.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      icon: DollarSign,
      color: 'green',
    },
    {
      label: 'Comissão Total',
      value: stats.comissaoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      icon: TrendingUp,
      color: 'purple',
    },
    {
      label: 'Total de Clientes',
      value: stats.totalClientes.toString(),
      icon: Users,
      color: 'orange',
    },
  ]

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 sm:mb-8">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`p-2.5 rounded-lg ${
                    card.color === 'blue'
                      ? 'bg-blue-100'
                      : card.color === 'green'
                      ? 'bg-green-100'
                      : card.color === 'purple'
                      ? 'bg-purple-100'
                      : 'bg-orange-100'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      card.color === 'blue'
                        ? 'text-blue-600'
                        : card.color === 'green'
                        ? 'text-green-600'
                        : card.color === 'purple'
                        ? 'text-purple-600'
                        : 'text-orange-600'
                    }`}
                  />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mb-1">{card.label}</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{card.value}</p>
            </div>
          )
        })}
      </div>
    </main>
  )
}