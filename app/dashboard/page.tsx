'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  TrendingUp, 
  FileText, 
  Users, 
  AlertCircle,
  DollarSign,
  Calendar
} from 'lucide-react'

interface Stats {
  totalPropostas: number
  totalClientes: number
  alertasRenovacao: number
  comissoesMes: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalPropostas: 0,
    totalClientes: 0,
    alertasRenovacao: 0,
    comissoesMes: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [propostas, clientes, renovacoes] = await Promise.all([
          fetch('/api/propostas').then(r => r.json()),
          fetch('/api/clientes').then(r => r.json()),
          fetch('/api/renovacoes').then(r => r.json()),
        ])

        const comissaoTotal = propostas.reduce((acc: number, p: any) => 
          acc + (p.comissao_total || 0), 0
        )

        setStats({
          totalPropostas: propostas.length,
          totalClientes: clientes.length,
          alertasRenovacao: renovacoes.length,
          comissoesMes: comissaoTotal,
        })
      } catch (error) {
        console.error('Erro ao carregar stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  const cards = [
    {
      title: 'Propostas',
      value: stats.totalPropostas,
      icon: FileText,
      color: 'bg-blue-500',
      link: '/propostas',
    },
    {
      title: 'Clientes',
      value: stats.totalClientes,
      icon: Users,
      color: 'bg-green-500',
      link: '/clientes',
    },
    {
      title: 'Alertas de Renovação',
      value: stats.alertasRenovacao,
      icon: AlertCircle,
      color: 'bg-amber-500',
      link: '/renovacoes',
    },
    {
      title: 'Comissões do Mês',
      value: `R$ ${stats.comissoesMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'bg-emerald-500',
      link: '/propostas',
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Carregando dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
          <p className="text-slate-600">Visão geral do sistema</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Link key={card.title} href={card.link}>
                <div className="bg-white rounded-xl p-6 border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`${card.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-slate-600 mb-1">
                    {card.title}
                  </h3>
                  <p className="text-2xl font-bold text-slate-900">
                    {card.value}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Ações Rápidas
            </h2>
            <div className="space-y-3">
              <Link
                href="/propostas"
                className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-blue-900">Nova Proposta</div>
                <div className="text-sm text-blue-700">Cadastrar nova proposta comercial</div>
              </Link>
              <Link
                href="/clientes"
                className="block p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-green-900">Novo Cliente</div>
                <div className="text-sm text-green-700">Adicionar cliente ao sistema</div>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              Próximos Vencimentos
            </h2>
            <div className="text-sm text-slate-600">
              {stats.alertasRenovacao > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">
                      {stats.alertasRenovacao} {stats.alertasRenovacao === 1 ? 'proposta' : 'propostas'} próximas do vencimento
                    </span>
                  </div>
                  <Link
                    href="/renovacoes"
                    className="inline-block mt-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Ver alertas →
                  </Link>
                </div>
              ) : (
                <p className="text-slate-500">Nenhum alerta no momento</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}