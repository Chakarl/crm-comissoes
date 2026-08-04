'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Plus, Search, FileText } from 'lucide-react'

interface Proposta {
  id: string
  numero_proposta: string
  tipo_proposta_codigo: string
  data_proposta: string
  valor_proposta: number
  prazo_meses: number
  status: string
  comissao_total: number
  clientes: {
    nome: string
  }
}

export default function PropostasPage() {
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadPropostas()
  }, [])

  const loadPropostas = async () => {
    const { data, error } = await supabase
      .from('propostas')
      .select(`
        id,
        numero_proposta,
        tipo_proposta_codigo,
        data_proposta,
        valor_proposta,
        prazo_meses,
        status,
        comissao_total,
        clientes(nome)
      `)
      .order('data_proposta', { ascending: false })

    if (!error && data) {
      setPropostas(data as any)
    }
    setLoading(false)
  }

  const filteredPropostas = propostas.filter(p =>
    p.numero_proposta.toLowerCase().includes(search.toLowerCase()) ||
    p.clientes.nome.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Carregando propostas...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Propostas</h1>
            <p className="text-slate-600">Gerencie todas as propostas</p>
          </div>
          <Link
            href="/propostas/nova"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Proposta
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por número ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Número</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Cliente</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Tipo</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Valor</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Comissão</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPropostas.map((proposta) => (
                <tr key={proposta.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {proposta.numero_proposta}
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {proposta.clientes.nome}
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {proposta.tipo_proposta_codigo}
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    R$ {proposta.valor_proposta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 font-semibold text-green-600">
                    R$ {proposta.comissao_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-medium
                      ${proposta.status === 'Aprovada' ? 'bg-green-100 text-green-700' : ''}
                      ${proposta.status === 'Pendente' ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${proposta.status === 'Rejeitada' ? 'bg-red-100 text-red-700' : ''}
                    `}>
                      {proposta.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPropostas.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma proposta encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}