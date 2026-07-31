'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { calcularComissao } from '../../../lib/comissoes'
import { useRouter } from 'next/navigation'
import '../dashboard.css'

interface Proposta {
  id: string
  numero_proposta: string
  data_fechamento: string
  tipo_contrato: string
  subtipo: string
  nome_cliente: string
  valor_contratado: number
  taxa_juros: number
  prazo: number
  percentual_comissao: number
  valor_comissao: number
  status: string
}

export default function PropostasPage() {
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    numero_proposta: '',
    data_fechamento: '',
    tipo_contrato: 'consignado',
    subtipo: 'publico',
    nome_cliente: '',
    valor_contratado: '',
    taxa_juros: '',
    prazo: ''
  })

  // Buscar propostas do usuário
  useEffect(() => {
    carregarPropostas()
  }, [])

  const carregarPropostas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      const { data, error } = await supabase
        .from('propostas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPropostas(data || [])
    } catch (error) {
      console.error('Erro ao carregar propostas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Pegar usuário autenticado
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Usuário não autenticado')
        return
      }

      // Calcular comissão
      const valorContratado = parseFloat(formData.valor_contratado)
      const taxaJuros = parseFloat(formData.taxa_juros) || undefined
      const prazo = parseInt(formData.prazo) || undefined

      const { percentual, valor } = calcularComissao(
        formData.tipo_contrato,
        formData.subtipo,
        valorContratado,
        taxaJuros,
        prazo
      )

      // Salvar no banco
      const { error } = await supabase
        .from('propostas')
        .insert({
          user_id: user.id,
          numero_proposta: formData.numero_proposta,
          data_fechamento: formData.data_fechamento,
          tipo_contrato: formData.tipo_contrato,
          subtipo: formData.subtipo,
          nome_cliente: formData.nome_cliente,
          valor_contratado: valorContratado,
          taxa_juros: taxaJuros,
          prazo: prazo,
          percentual_comissao: percentual,
          valor_comissao: valor,
          status: 'ativa'
        })

      if (error) throw error

      // Se for consórcio, criar as 5 parcelas
      if (formData.tipo_contrato === 'consorcio') {
        await criarParcelasConsorcio(valor, formData.data_fechamento)
      }

      alert('Proposta cadastrada com sucesso!')
      setShowModal(false)
      setFormData({
        numero_proposta: '',
        data_fechamento: '',
        tipo_contrato: 'consignado',
        subtipo: 'publico',
        nome_cliente: '',
        valor_contratado: '',
        taxa_juros: '',
        prazo: ''
      })
      carregarPropostas()

    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar proposta. Verifique o console.')
    } finally {
      setSaving(false)
    }
  }

  const criarParcelasConsorcio = async (valorComissao: number, dataFechamento: string) => {
    const valorParcela = valorComissao / 5
    const data = new Date(dataFechamento)
    const dia = data.getDate()
    
    // Se fechou depois do dia 25, primeira parcela vai pro mês seguinte
    if (dia > 25) {
      data.setMonth(data.getMonth() + 1)
    }

    const parcelas = []
    for (let i = 0; i < 5; i++) {
      const mesParcela = new Date(data)
      mesParcela.setMonth(data.getMonth() + i)
      mesParcela.setDate(1)
      
      parcelas.push({
        mes_referencia: mesParcela.toISOString().split('T')[0],
        valor: valorParcela
      })
    }

    // Salvar parcelas no banco (implementar depois)
    console.log('Parcelas de consórcio:', parcelas)
  }

  const deletarProposta = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta proposta?')) return

    try {
      const { error } = await supabase
        .from('propostas')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      alert('Proposta excluída!')
      carregarPropostas()
    } catch (error) {
      console.error('Erro ao excluir:', error)
      alert('Erro ao excluir proposta')
    }
  }

  return (
    <div className="dashboard">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">💰 CRM Comissões</div>
        <nav className="sidebar-menu">
          <Link href="/dashboard" className="sidebar-item">
            📊 Dashboard
          </Link>
          <Link href="/dashboard/propostas" className="sidebar-item active">
            📝 Propostas
          </Link>
          <Link href="/dashboard/comissoes" className="sidebar-item">
            💵 Comissões
          </Link>
          <Link href="/dashboard/clientes" className="sidebar-item">
            👥 Clientes
          </Link>
          <Link href="/dashboard/relatorios" className="sidebar-item">
            📈 Relatórios
          </Link>
        </nav>
        <div style={{ marginTop: 'auto', padding: '20px' }}>
          <button onClick={handleLogout} className="logout-btn" style={{ width: '100%' }}>
            Sair
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {/* HEADER */}
        <header className="header">
          <div className="header-left">
            <h1>Propostas</h1>
            <p>Gerencie suas propostas e calcule comissões automaticamente</p>
          </div>
        </header>

        {/* BOTÃO NOVA PROPOSTA */}
        <div style={{ marginBottom: '24px' }}>
          <button 
            onClick={() => setShowModal(true)}
            style={{
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
            }}
          >
            ➕ Nova Proposta
          </button>
        </div>

        {/* TABELA */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>
        ) : propostas.length === 0 ? (
          <div className="content-section" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📋</div>
            <h3 style={{ marginBottom: '10px', color: '#374151' }}>Nenhuma proposta cadastrada</h3>
            <p style={{ color: '#6b7280' }}>Clique em "Nova Proposta" para começar</p>
          </div>
        ) : (
          <div className="content-section" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                  <th style={{ padding: '14px', textAlign: 'left', color: '#374151', fontWeight: 600 }}>Nº Proposta</th>
                  <th style={{ padding: '14px', textAlign: 'left', color: '#374151', fontWeight: 600 }}>Cliente</th>
                  <th style={{ padding: '14px', textAlign: 'left', color: '#374151', fontWeight: 600 }}>Tipo</th>
                  <th style={{ padding: '14px', textAlign: 'left', color: '#374151', fontWeight: 600 }}>Valor Contrato</th>
                  <th style={{ padding: '14px', textAlign: 'left', color: '#374151', fontWeight: 600 }}>% Comissão</th>
                  <th style={{ padding: '14px', textAlign: 'left', color: '#374151', fontWeight: 600 }}>Valor Comissão</th>
                  <th style={{ padding: '14px', textAlign: 'left', color: '#374151', fontWeight: 600 }}>Data</th>
                  <th style={{ padding: '14px', textAlign: 'center', color: '#374151', fontWeight: 600 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {propostas.map((proposta) => (
                  <tr key={proposta.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '16px', fontWeight: 500 }}>{proposta.numero_proposta}</td>
                    <td style={{ padding: '16px' }}>{proposta.nome_cliente}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: '#dbeafe',
                        color: '#1e40af'
                      }}>
                        {proposta.tipo_contrato}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: '#374151', fontWeight: 500 }}>
                      R$ {proposta.valor_contratado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '16px', color: '#10b981', fontWeight: 600 }}>
                      {proposta.percentual_comissao}%
                    </td>
                    <td style={{ padding: '16px', color: '#10b981', fontWeight: 700, fontSize: '16px' }}>
                      R$ {proposta.valor_comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>
                      {new Date(proposta.data_fechamento).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <button 
                        onClick={() => deletarProposta(proposta.id)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#ef4444', 
                          cursor: 'pointer',
                          fontSize: '18px'
                        }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* MODAL NOVA PROPOSTA */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 700, color: '#111827' }}>
              Nova Proposta
            </h2>
            <form onSubmit={handleSubmit}>
              {/* Número da Proposta */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                  Nº Proposta *
                </label>
                <input
                  type="text"
                  value={formData.numero_proposta}
                  onChange={(e) => setFormData({ ...formData, numero_proposta: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '15px'
                  }}
                  required
                />
              </div>

              {/* Data de Fechamento */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                  Data de Fechamento *
                </label>
                <input
                  type="date"
                  value={formData.data_fechamento}
                  onChange={(e) => setFormData({ ...formData, data_fechamento: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '15px'
                  }}
                  required
                />
              </div>

              {/* Nome do Cliente */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  value={formData.nome_cliente}
                  onChange={(e) => setFormData({ ...formData, nome_cliente: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '15px'
                  }}
                  required
                />
              </div>

              {/* Tipo de Contrato */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                  Tipo de Contrato *
                </label>
                <select
                  value={formData.tipo_contrato}
                  onChange={(e) => setFormData({ ...formData, tipo_contrato: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '15px'
                  }}
                  required
                >
                  <option value="consignado">Consignado</option>
                  <option value="inss">INSS</option>
                  <option value="nao_consignado">Não Consignado</option>
                  <option value="consorcio">Consórcio</option>
                </select>
              </div>

              {/* Subtipo */}
              {formData.tipo_contrato === 'consignado' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                    Subtipo *
                  </label>
                  <select
                    value={formData.subtipo}
                    onChange={(e) => setFormData({ ...formData, subtipo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '15px'
                    }}
                  >
                    <option value="publico">Público / Exército</option>
                    <option value="privado">Privado</option>
                    <option value="mpdg">MPDG / SIAPE</option>
                    <option value="sp">SP / MG</option>
                  </select>
                </div>
              )}

              {formData.tipo_contrato === 'inss' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                    Subtipo *
                  </label>
                  <select
                    value={formData.subtipo}
                    onChange={(e) => setFormData({ ...formData, subtipo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '15px'
                    }}
                  >
                    <option value="novo">Novo</option>
                    <option value="renovacao">Renovação</option>
                  </select>
                </div>
              )}

              {/* Valor Contratado */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                  Valor Contratado (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor_contratado}
                  onChange={(e) => setFormData({ ...formData, valor_contratado: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '15px'
                  }}
                  required
                />
              </div>

              {/* Taxa de Juros (não obrigatória para consórcio) */}
              {formData.tipo_contrato !== 'consorcio' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                    Taxa de Juros (% ao mês)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.taxa_juros}
                    onChange={(e) => setFormData({ ...formData, taxa_juros: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '15px'
                    }}
                  />
                </div>
              )}

              {/* Prazo (não obrigatório para consórcio) */}
              {formData.tipo_contrato !== 'consorcio' && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                    Prazo (meses)
                  </label>
                  <input
                    type="number"
                    value={formData.prazo}
                    onChange={(e) => setFormData({ ...formData, prazo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '15px'
                    }}
                  />
                </div>
              )}

              {/* Botões */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  style={{
                    padding: '12px 24px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '12px 24px',
                    background: saving ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Salvando...' : 'Salvar Proposta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}