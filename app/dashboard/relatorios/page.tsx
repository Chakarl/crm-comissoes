'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

interface Proposta {
  id: string
  numero_proposta: string
  data_fechamento: string
  tipo_contrato: string
  nome_cliente: string
  valor_contratado: number
  valor_comissao: number
  status: string
}

export default function DashboardPage() {
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [userName, setUserName] = useState('Usuário')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
  try {
    setLoading(true)

    // 1. Buscar usuário logado
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Erro ao buscar usuário:', userError)
      router.push('/')
      return
    }

    console.log('✅ Usuário logado:', user.id, user.email)

    // 2. Buscar nome do perfil
    const { data: perfil, error: perfilError } = await supabase
      .from('profiles')
      .select('nome_completo, telefone')
      .eq('id', user.id)
      .single()

    if (perfilError) {
      console.error('❌ Erro ao buscar perfil:', perfilError)
    } else {
      console.log('✅ Perfil encontrado:', perfil)
    }

    // 3. Extrair primeiro nome
    let primeiroNome = 'Usuário'
    
    if (perfil?.nome_completo) {
      primeiroNome = perfil.nome_completo.split(' ')[0]
      console.log('✅ Primeiro nome extraído do perfil:', primeiroNome)
    } else if (user.email) {
      primeiroNome = user.email.split('@')[0].split('.')[0]
      primeiroNome = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1)
      console.log('⚠️ Nome extraído do email:', primeiroNome)
    }

    setUserName(primeiroNome)

    // 4. Buscar propostas ativas
    const { data, error } = await supabase
      .from('propostas')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'ativa')
      .order('data_fechamento', { ascending: false })

    if (error) {
      console.error('Erro ao buscar propostas:', error)
    } else {
      console.log('✅ Propostas carregadas:', data?.length || 0)
      setPropostas(data || [])
    }

  } catch (error) {
    console.error('❌ Erro geral ao carregar dados:', error)
  } finally {
    setLoading(false)
  }
}

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Calcular métricas
  const totalComissoes = propostas.reduce((sum, p) => sum + p.valor_comissao, 0)
  const totalContratos = propostas.reduce((sum, p) => sum + p.valor_contratado, 0)
  const ticketMedio = propostas.length > 0 ? totalContratos / propostas.length : 0

  return (
    <div className="dashboard">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">💰 CRM Comissões</div>
        <nav className="sidebar-menu">
          <Link href="/dashboard" className="sidebar-item active">
            📊 Dashboard
          </Link>
          <Link href="/dashboard/propostas" className="sidebar-item">
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
            <h1>Dashboard</h1>
            <p>Bem-vindo de volta! Aqui está o resumo das suas comissões.</p>
          </div>
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">{userName.charAt(0).toUpperCase()}</div>
              <div>
                <div className="user-name">Olá, {userName}! 👋</div>
                <div className="user-role">Consultor de Crédito</div>
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Carregando...
          </div>
        ) : (
          <>
            {/* CARDS DE MÉTRICAS */}
            <div className="metrics-grid">
              {/* Total de Comissões */}
              <div className="metric-card">
                <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  💰
                </div>
                <div className="metric-content">
                  <div className="metric-label">Comissões Ativas</div>
                  <div className="metric-value">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalComissoes)}
                  </div>
                  <div className="metric-footer">
                    {propostas.length} {propostas.length === 1 ? 'proposta' : 'propostas'}
                  </div>
                </div>
              </div>

              {/* Total de Contratos */}
              <div className="metric-card">
                <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                  📊
                </div>
                <div className="metric-content">
                  <div className="metric-label">Total Contratado</div>
                  <div className="metric-value">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalContratos)}
                  </div>
                  <div className="metric-footer">
                    Volume total de contratos
                  </div>
                </div>
              </div>

              {/* Ticket Médio */}
              <div className="metric-card">
                <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                  📈
                </div>
                <div className="metric-content">
                  <div className="metric-label">Ticket Médio</div>
                  <div className="metric-value">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ticketMedio)}
                  </div>
                  <div className="metric-footer">
                    Por proposta fechada
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO: ÚLTIMAS PROPOSTAS */}
            <div className="content-section">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
                    Últimas Propostas
                  </h2>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>
                    Propostas fechadas recentemente
                  </p>
                </div>
                <Link href="/dashboard/propostas" className="btn-primary">
                  Ver todas
                </Link>
              </div>

              {propostas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '64px', marginBottom: '20px' }}>📝</div>
                  <h3 style={{ marginBottom: '10px', color: '#374151' }}>
                    Nenhuma proposta cadastrada
                  </h3>
                  <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                    Comece cadastrando sua primeira proposta
                  </p>
                  <Link href="/dashboard/propostas" className="btn-primary">
                    Cadastrar Proposta
                  </Link>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nº Proposta</th>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Cliente</th>
                        <th>Valor Contratado</th>
                        <th>Comissão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {propostas.slice(0, 5).map(proposta => (
                        <tr key={proposta.id}>
                          <td><strong>{proposta.numero_proposta}</strong></td>
                          <td>{new Date(proposta.data_fechamento).toLocaleDateString('pt-BR')}</td>
                          <td>
                            <span className="badge badge-primary">{proposta.tipo_contrato}</span>
                          </td>
                          <td>{proposta.nome_cliente}</td>
                          <td>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposta.valor_contratado)}
                          </td>
                          <td>
                            <strong style={{ color: '#059669' }}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposta.valor_comissao)}
                            </strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}