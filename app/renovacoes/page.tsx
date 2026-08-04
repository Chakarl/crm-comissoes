'use client'

import { useEffect, useState } from 'react'
import { Bell, AlertCircle } from 'lucide-react'

interface Renovacao {
  proposta_id: string
  numero_proposta: string
  cliente_nome: string
  data_proposta: string
  prazo_meses: number
  dias_para_vencimento: number
}

export default function RenovacoesPage() {
  const [renovacoes, setRenovacoes] = useState<Renovacao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRenovacoes()
  }, [])

  const loadRenovacoes = async () => {
    try {
      const res = await fetch('/api/renovacoes')
      const data = await res.json()
      setRenovacoes(data)
    } catch (error) {
      console.error('Erro ao carregar renovações:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Carregando alertas...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Alertas de Renovação</h1>
          <p className="text-slate-600">Propostas próximas do vencimento</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Proposta</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Cliente</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Data</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Prazo</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Dias para Vencimento</th>
              </tr>
            </thead>
            <tbody>
              {renovacoes.map((r) => (
                <tr key={r.proposta_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{r.numero_proposta}</td>
                  <td className="px-6 py-4 text-slate-700">{r.cliente_nome}</td>
                  <td className="px-6 py-4 text-slate-700">
                    {new Date(r.data_proposta).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-slate-700">{r.prazo_meses} meses</td>
                  <td className="px-6 py-4">
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-medium
                      ${r.dias_para_vencimento <= 30 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}
                    `}>
                      {r.dias_para_vencimento} dias
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {renovacoes.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum alerta de renovação</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}