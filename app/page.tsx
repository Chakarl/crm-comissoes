'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Proposta = {
  id: string
  nome: string
  descricao: string
  taxa_comissao: number
  prazo_dias: number
  created_at: string
}

export default function Home() {
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Campos do formulário
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [taxa, setTaxa] = useState('')
  const [prazo, setPrazo] = useState('')

  const supabase = createClient()

  useEffect(() => {
    carregarPropostas()
  }, [])

  async function carregarPropostas() {
    const { data, error } = await supabase
      .from('propostas')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao carregar propostas:', error)
    } else {
      setPropostas(data || [])
    }
    setLoading(false)
  }

  async function salvarProposta(e: React.FormEvent) {
    e.preventDefault()
    
    const dados = {
      nome,
      descricao,
      taxa_comissao: parseFloat(taxa),
      prazo_dias: parseInt(prazo)
    }

    if (editingId) {
      // Atualizar proposta existente
      const { error } = await supabase
        .from('propostas')
        .update(dados)
        .eq('id', editingId)

      if (error) {
        alert('Erro ao atualizar proposta: ' + error.message)
      } else {
        alert('Proposta atualizada com sucesso!')
        limparFormulario()
        carregarPropostas()
      }
    } else {
      // Criar nova proposta
      const { error } = await supabase
        .from('propostas')
        .insert([dados])

      if (error) {
        alert('Erro ao cadastrar proposta: ' + error.message)
      } else {
        alert('Proposta cadastrada com sucesso!')
        limparFormulario()
        carregarPropostas()
      }
    }
  }

  function limparFormulario() {
    setNome('')
    setDescricao('')
    setTaxa('')
    setPrazo('')
    setEditingId(null)
    setShowForm(false)
  }

  function editarProposta(proposta: Proposta) {
    setNome(proposta.nome)
    setDescricao(proposta.descricao)
    setTaxa(proposta.taxa_comissao.toString())
    setPrazo(proposta.prazo_dias.toString())
    setEditingId(proposta.id)
    setShowForm(true)
  }

  async function excluirProposta(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta proposta?')) return

    const { error } = await supabase
      .from('propostas')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Erro ao excluir: ' + error.message)
    } else {
      alert('Proposta excluída!')
      carregarPropostas()
    }
  }

  if (loading) {
    return <div className="p-8">Carregando...</div>
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">CRM - Gestão de Comissões</h1>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Nova Proposta
          </button>
        )}

        {showForm && (
          <form onSubmit={salvarProposta} className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Editar Proposta' : 'Nova Proposta'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome da Proposta</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Taxa de Comissão (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={taxa}
                  onChange={(e) => setTaxa(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Prazo (dias)</label>
                <input
                  type="number"
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </button>
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold p-6 border-b">Propostas Cadastradas</h2>
          
          {propostas.length === 0 ? (
            <p className="p-6 text-gray-500">Nenhuma proposta cadastrada ainda.</p>
          ) : (
            <div className="divide-y">
              {propostas.map((proposta) => (
                <div key={proposta.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{proposta.nome}</h3>
                      <p className="text-gray-600 mt-1">{proposta.descricao}</p>
                      <div className="mt-2 text-sm text-gray-500">
                        <span className="mr-4">Taxa: {proposta.taxa_comissao}%</span>
                        <span>Prazo: {proposta.prazo_dias} dias</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => editarProposta(proposta)}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => excluirProposta(proposta.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}