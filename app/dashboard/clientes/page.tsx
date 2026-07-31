'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import '../dashboard.css'

interface Cliente {
  nome: string
  totalPropostas: number
  valorTotal: number
  comissaoTotal: number
  ultimaProposta: string
  propostas: Proposta[]
}

interface Proposta {
  id: string
  numero_proposta: string
  data_fechamento: string
  tipo_contrato: string
  nome_cliente: string
  valor_contratado: number
  percentual_comissao: number
  valor_comissao: number
  status: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const router = useRouter()

  useEffect(() => {
    carregarClientes()
  }, [])

  const carregarClientes = async () => {
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
        .order('data_fechamento', { ascending: false })

      if (error) throw error

      // Agrupar propostas por cliente
      const clientesMap = new Map<string, Cliente>()

      data?.forEach(proposta => {
        const nomeCliente = proposta.nome_cliente.trim()
        
        if (!clientesMap.has(nomeCliente)) {
          clientesMap.set(nomeCliente, {
            nome: nomeCliente,
            totalPropostas: 0,
            valorTotal: 0,
            comissaoTotal: 0,
            ultimaProposta: proposta.data_fechamento,
            propostas: []
          })
        }

        const cliente = clientesMap.get(nomeCliente)!
        cliente.totalPropostas++
        cliente.valorTotal += proposta.valor_contratado
        cliente.comissaoTotal += proposta.valor_comissao
        cliente.propostas.push(proposta)

        // Atualizar última proposta
        if (proposta.data_fechamento > cliente.ultimaProposta) {
          cliente.ultimaProposta = proposta.data_fechamento
        }
      })

      // Converter para array e ordenar por valor total
      const clientesArray = Array.from(clientesMap.values())
        .sort((a, b) => b.valorTotal - a.valorTotal)

      setClientes(clientesArray)

    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Filtrar clientes pela busca
  const clientesFiltrados = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(busca.toLowerCase())
  )

  // Formatar data
  const formatarData = (data: string) => {
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
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
          <Link href="/dashboard/propostas" className="sidebar-item">
            📝 Propostas
          </Link>
          <Link href="/dashboard/comissoes" className="sidebar-item">
            💵 Comissões
          </Link>
          <Link href="/dashboard/clientes" className="sidebar-item active">
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
            <h1>Clientes</h1>
            <p>Gerencie seus clientes e acompanhe o histórico de propostas</p>
          </div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>
        ) : (
          <>
            {/* BARRA DE BUSCA E ESTATÍSTICAS */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px',
                marginBottom: '20px'
              }}>
                {/* Total de Clientes */}
                <div className="content-section" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                    Total de Clientes
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>
                    {clientes.length}
                  </div>
                </div>

                {/* Cliente TOP */}
                {clientes.length > 0 && (
                  <div className="content-section" style={{ padding: '16px' }}>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                      Cliente TOP
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#059669' }}>
                      {clientes[0].nome}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(clientes[0].valorTotal)}
                    </div>
                  </div>
                )}
              </div>

              {/* Campo de busca */}
              <input
                type="text"
                placeholder="🔍 Buscar cliente..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* LISTA DE CLIENTES */}
            {clientesFiltrados.length === 0 ? (
              <div className="content-section" style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>👥</div>
                <h3 style={{ marginBottom: '10px', color: '#374151' }}>
                  {busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                </h3>
                <p style={{ color: '#6b7280' }}>
                  {busca ? 'Tente outro termo de busca' : 'Cadastre propostas para ver seus clientes aqui'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {clientesFiltrados.map(cliente => (
                  <div 
                    key={cliente.nome}
                    className="content-section"
                    style={{ 
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: '2px solid transparent'
                    }}
                    onClick={() => setClienteSelecionado(cliente)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#667eea'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                      {/* Nome e informações */}
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
                          {cliente.nome}
                        </h3>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                          gap: '12px',
                          fontSize: '14px'
                        }}>
                          <div>
                            <div style={{ color: '#6b7280', marginBottom: '2px' }}>Propostas</div>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{cliente.totalPropostas}</div>
                          </div>
                          <div>
                            <div style={{ color: '#6b7280', marginBottom: '2px' }}>Valor Total</div>
                            <div style={{ fontWeight: 600, color: '#111827' }}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cliente.valorTotal)}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#6b7280', marginBottom: '2px' }}>Comissão Total</div>
                            <div style={{ fontWeight: 600, color: '#059669' }}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cliente.comissaoTotal)}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#6b7280', marginBottom: '2px' }}>Última Proposta</div>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{formatarData(cliente.ultimaProposta)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Seta */}
                      <div style={{ fontSize: '24px', color: '#9ca3af' }}>→</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL DE DETALHES DO CLIENTE */}
      {clienteSelecionado && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setClienteSelecionado(null)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div style={{ 
              padding: '24px',
              borderBottom: '2px solid #f3f4f6',
              position: 'sticky',
              top: 0,
              background: 'white',
              zIndex: 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                    {clienteSelecionado.nome}
                  </h2>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>
                    {clienteSelecionado.totalPropostas} proposta{clienteSelecionado.totalPropostas !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setClienteSelecionado(null)}
                  style={{
                    width: '36px',
                    height: '36px',
                    border: 'none',
                    background: '#f3f4f6',
                    borderRadius: '8px',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Resumo */}
            <div style={{ padding: '24px', borderBottom: '2px solid #f3f4f6' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '20px' 
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Valor Total</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(clienteSelecionado.valorTotal)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Comissão Total</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(clienteSelecionado.comissaoTotal)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Ticket Médio</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      clienteSelecionado.valorTotal / clienteSelecionado.totalPropostas
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de Propostas */}
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#111827' }}>
                Histórico de Propostas
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {clienteSelecionado.propostas.map(proposta => (
                  <div 
                    key={proposta.id}
                    style={{
                      padding: '16px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                          Proposta #{proposta.numero_proposta}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          {formatarData(proposta.data_fechamento)}
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 12px',
                        background: proposta.status === 'ativa' ? '#d1fae5' : '#fee2e2',
                        color: proposta.status === 'ativa' ? '#059669' : '#dc2626',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        height: 'fit-content'
                      }}>
                        {proposta.status}
                      </div>
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '12px',
                      fontSize: '14px'
                    }}>
                      <div>
                        <div style={{ color: '#6b7280', marginBottom: '2px' }}>Tipo</div>
                        <div style={{ fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>
                          {proposta.tipo_contrato.replace('_', ' ')}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#6b7280', marginBottom: '2px' }}>Valor</div>
                        <div style={{ fontWeight: 600, color: '#111827' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposta.valor_contratado)}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#6b7280', marginBottom: '2px' }}>Comissão</div>
                        <div style={{ fontWeight: 600, color: '#059669' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposta.valor_comissao)}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#6b7280', marginBottom: '2px' }}>% Comissão</div>
                        <div style={{ fontWeight: 600, color: '#111827' }}>
                          {proposta.percentual_comissao.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}