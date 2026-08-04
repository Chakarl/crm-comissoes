'use client'

import { useState, useEffect } from 'react'
import { Bell, Calendar, FileText, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface Alerta {
  proposta_id: string
  cliente_id: string
  numero_proposta: string
  nome_cliente: string
  data_proposta: string
  prazo_meses: number
  meses_decorridos: number
  ciclos_completos: number
  parcelas_pagas_no_marco: number
  mensagem_alerta: string
}

export default function RenovacoesPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAlertas = async () => {
      const res = await fetch('/api/renovacoes')
      const data = await res.json()
      setAlertas(data)
      setLoading(false)
    }
    loadAlertas()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Bell className="w-8 h-8 text-amber-600" />
            Alertas de Renovação
          </h1>
          <p className="text-slate-600 mt-1">
            {alertas.length} {alertas.length === 1 ? 'contrato apto' : 'contratos aptos'}
          </p>
        </div>

        {/* Resumo em cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{alertas.length}</p>
                <p className="text-sm text-slate-600">Contratos aptos</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {alertas.filter((a) => a.ciclos_completos >= 2).length}
                </p>
                <p className="text-sm text-slate-600">2+ ciclos completos</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {alertas.filter((a) => a.mensagem_alerta.includes('quitação')).length}
                </p>
                <p className="text-sm text-slate-600">Próximos da quitação</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de alertas */}
        {loading ? (
          <div className="text-center py-12 text-slate-500">Carregando...</div>
        ) : alertas.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            Nenhum contrato apto para renovação no momento.
          </div>
        ) : (
          <div className="space-y-3">
            {alertas.map((alerta) => (
              <div
                key={alerta.proposta_id}
                className="bg-white rounded-lg p-5 border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link
                        href={`/clientes/${alerta.cliente_id}`}
                        className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                      >
                        {alerta.nome_cliente}
                      </Link>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                        {alerta.ciclos_completos} {alerta.ciclos_completos === 1 ? 'ciclo' : 'ciclos'}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 mb-3">{alerta.mensagem_alerta}</p>

                    <div className="flex items-center gap-6 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        {alerta.numero_proposta}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {new Date(alerta.data_proposta).toLocaleDateString('pt-BR')}
                      </div>
                      <div>
                        {alerta.meses_decorridos} / {alerta.prazo_meses} meses
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/propostas/${alerta.proposta_id}`}
                    className="ml-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Ver Proposta
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}