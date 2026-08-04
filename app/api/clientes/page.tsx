'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Plus, User } from 'lucide-react'
import ClienteCard from './components/ClienteCard'
import ClienteForm from './components/ClienteForm'

interface Cliente {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  propostas: { count: number }[]
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const loadClientes = async (query = '') => {
    setLoading(true)
    const url = query ? `/api/clientes?q=${encodeURIComponent(query)}` : '/api/clientes'
    const res = await fetch(url)
    const data = await res.json()
    setClientes(data)
    setLoading(false)
  }

  useEffect(() => {
    loadClientes()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadClientes(busca)
  }

  const handleClienteCreated = () => {
    setShowForm(false)
    loadClientes()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <User className="w-8 h-8 text-blue-600" />
              Clientes
            </h1>
            <p className="text-slate-600 mt-1">
              {clientes.length} {clientes.length === 1 ? 'cadastrado' : 'cadastrados'}
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" />
            Novo Cliente
          </button>
        </div>

        {/* Formulário de criação (modal inline) */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Novo Cliente</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <ClienteForm onSuccess={handleClienteCreated} />
          </div>
        )}

        {/* Busca */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou CPF..."
              className="w-full pl-12 pr-4 py-3 bg-white rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
          </div>
        </form>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-12 text-slate-500">Carregando...</div>
        ) : clientes.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            {busca ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientes.map((cliente) => (
              <ClienteCard key={cliente.id} cliente={cliente} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}