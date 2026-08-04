'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'

const supabase = createClient()

export default function EditarPropostaPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  const [form, setForm] = useState({
    numero_proposta: '',
    data_proposta: '',
    tipo_proposta_codigo: '',
    nome_cliente: '',
    valor_contratado: '',
    taxa_juros: '',
    prazo: '',
  })

  const [tipos, setTipos] = useState<any[]>([])

  useEffect(() => {
    loadProposta()
    loadTipos()
  }, [])

  const loadTipos = async () => {
    const { data } = await supabase
      .from('tipos_proposta')
      .select('*')
      .order('categoria, nome')
    if (data) setTipos(data)
  }

  const loadProposta = async () => {
    const { data, error } = await supabase
      .from('propostas')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      setErro('Proposta não encontrada')
      setLoading(false)
      return
    }

    setForm({
      numero_proposta: data.numero_proposta || '',
      data_proposta: data.data_proposta || '',
      tipo_proposta_codigo: data.tipo_proposta_codigo || '',
      nome_cliente: data.nome_cliente || '',
      valor_contratado: data.valor_contratado?.toString() || '',
      taxa_juros: data.taxa_juros?.toString() || '',
      prazo: data.prazo?.toString() || '',
    })
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErro(null)

    const { error } = await supabase
      .from('propostas')
      .update({
        numero_proposta: form.numero_proposta,
        data_proposta: form.data_proposta,
        tipo_proposta_codigo: form.tipo_proposta_codigo,
        nome_cliente: form.nome_cliente,
        valor_contratado: parseFloat(form.valor_contratado),
        taxa_juros: form.taxa_juros ? parseFloat(form.taxa_juros) : null,
        prazo: form.prazo ? parseInt(form.prazo) : null,
      })
      .eq('id', id)

    if (error) {
      setErro(error.message)
    } else {
      setSucesso(true)
      setTimeout(() => router.push('/propostas'), 1500)
    }
    setSaving(false)
  }

  const categorias = tipos.reduce<Record<string, any[]>>((acc, t) => {
    if (!acc[t.categoria]) acc[t.categoria] = []
    acc[t.categoria].push(t)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/propostas" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 mb-6">Editar Proposta</h1>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            ✅ Proposta atualizada! Redirecionando...
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nº Proposta</label>
              <input
                required
                type="text"
                value={form.numero_proposta}
                onChange={(e) => setForm({ ...form, numero_proposta: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data</label>
              <input
                required
                type="date"
                value={form.data_proposta}
                onChange={(e) => setForm({ ...form, data_proposta: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Proposta</label>
            <select
              required
              value={form.tipo_proposta_codigo}
              onChange={(e) => setForm({ ...form, tipo_proposta_codigo: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {Object.entries(categorias).map(([cat, lista]) => (
                <optgroup key={cat} label={cat}>
                  {lista.map((t: any) => (
                    <option key={t.codigo} value={t.codigo}>{t.nome}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nome do Cliente</label>
            <input
              required
              type="text"
              value={form.nome_cliente}
              onChange={(e) => setForm({ ...form, nome_cliente: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Valor Contratado (R$)</label>
            <input
              required
              type="number"
              step="0.01"
              value={form.valor_contratado}
              onChange={(e) => setForm({ ...form, valor_contratado: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Taxa de Juros (% a.m)</label>
            <input
              type="number"
              step="0.01"
              value={form.taxa_juros}
              onChange={(e) => setForm({ ...form, taxa_juros: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Prazo (meses)</label>
            <input
              type="number"
              value={form.prazo}
              onChange={(e) => setForm({ ...form, prazo: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </button>
            <Link
              href="/propostas"
              className="px-6 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}