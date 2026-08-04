'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Edit2, Trash2, FileText, Calendar } from 'lucide-react'
import Link from 'next/link'
import ClienteForm from '../components/ClienteForm'

interface Proposta {
  id: string
  numero_proposta: string
  tipo_proposta_codigo: string
  data_proposta: string
  valor_proposta: number
  prazo_meses: number
  status: string
}

interface Cliente {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  agencia: string | null
  conta: string | null
  created_at: string
  propostas: Proposta[]
}

export default function ClienteDetalhePage() {
  const router = useRouter()
  const params = useParams()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadCliente = async () => {
    const res = await fetch(`/api/clientes/${params.id}`)
    const data = await res.json()
    setCliente(data)
    setLoading(false)
  }

  useEffect(() => {
    loadCliente()
  }, [params.id])

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return

    const res = await fetch(`/api/clientes/${params.id}`, { method: 'DELETE' })
    const data = await res.json()

    if (!res.ok) {
      alert(data.error)
      return
    }

    router.push('/clientes')
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Carregando...</div>
  }

  if (!cliente) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Cliente não encontrado.</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/clientes" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4">
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{cliente.nome}</h1>
              {cliente.cpf && <p className="text-slate-600 mt-1">CPF: {cliente.cpf}</p>}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditing(!editing)}
                className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
            </div>
          </div>
        </div>

        {/* Edição */}
        {editing && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Editar Cliente</h2>
            <ClienteForm
              cliente={cliente}
              onSuccess={() => {
                setEditing(false)
                loadCliente()
              }}
            />
          </div>
        )}

        {/* Dados bancários */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Dados Bancários</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Agência:</span>
              <p className="font-medium text-slate-900">{cliente.agencia || '—'}</p>
            </div>
            <div>
              <span className="text-slate-500">Conta:</span>
              <p className="font-medium text-slate-900">{cliente.conta || '—'}</p>
            </div>
            <div>
              <span className="text-slate-500">Telefone:</span>
              <p className="font-medium text-slate-900">{cliente.telefone || '—'}</p>
            </div>
            <div>
              <span className="text-slate-500">Cadastrado em:</span>
              <p className="font-medium text-slate-900">
                {new Date(cliente.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        {/* Histórico de propostas */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Histórico de Propostas ({cliente.propostas.length})
          </h2>

          {cliente.propostas.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Nenhuma proposta vinculada.</p>
          ) : (
            <div className="space-y-3">
              {cliente.propostas.map((proposta) => (
                <Link
                  key={proposta.id}
                  href={`/propostas/${proposta.id}`}
                  className="block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-4 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{proposta.numero_proposta}</p>
                      <p className="text-sm text-slate-600">{proposta.tipo_proposta_codigo}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {proposta.valor_proposta.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </p>
                      <p className="text-sm text-slate-600 flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3" />
                        {new Date(proposta.data_proposta).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}