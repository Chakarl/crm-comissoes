'use client'

import { useState } from 'react'

interface ClienteFormProps {
  cliente?: {
    id?: string
    nome: string
    cpf: string | null
    telefone: string | null
    agencia: string | null
    conta: string | null
  }
  onSuccess: () => void
}

export default function ClienteForm({ cliente, onSuccess }: ClienteFormProps) {
  const [form, setForm] = useState({
    nome: cliente?.nome || '',
    cpf: cliente?.cpf || '',
    telefone: cliente?.telefone || '',
    agencia: cliente?.agencia || '',
    conta: cliente?.conta || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const method = cliente?.id ? 'PUT' : 'POST'
    const url = cliente?.id ? `/api/clientes/${cliente.id}` : '/api/clientes'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erro ao salvar cliente.')
      setLoading(false)
      return
    }

    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nome <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
          <input
            type="text"
            value={form.cpf}
            onChange={(e) => setForm({ ...form, cpf: e.target.value })}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
          <input
            type="text"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Agência</label>
          <input
            type="text"
            value={form.agencia}
            onChange={(e) => setForm({ ...form, agencia: e.target.value })}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Conta</label>
          <input
            type="text"
            value={form.conta}
            onChange={(e) => setForm({ ...form, conta: e.target.value })}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg transition-colors"
      >
        {loading ? 'Salvando...' : cliente?.id ? 'Salvar Alterações' : 'Criar Cliente'}
      </button>
    </form>
  )
}