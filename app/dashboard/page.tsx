'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import './dashboard.css'

interface Proposta {
  id: string
  numero_proposta: string
  data_fechamento: string
  tipo_contrato: string
  nome_cliente: string
  valor_contratado: number
  percentual_comissao: number
  valor_comissao: number
}

interface ComissaoMensal {
  mes: string
  total: number
}

export default function DashboardPage() {
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const router = useRouter()

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      setUserName(user.email?.split('@')[0] || 'Usuário')

      const { data, error } = await supabase
        .from('propostas')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'ativa')
        .order('data_fechamento', { ascending: false })

      if (error) throw error
      setPropostas(data || [])

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Calcular comissões por mês (com distribuição de consórcio)
  const calcularComissoesMensais = (): ComissaoMensal[] => {
    const mesesMap = new Map<string, number>()

    propostas.forEach(proposta => {
      const mes = proposta.data_fechamento.slice(0, 7)
      const tipo = proposta.tipo_contrato.toLowerCase()

      if (tipo === 'consorcio') {
        const valorParcela = proposta.valor_comissao / 5
        const dataFechamento = new Date(proposta.data_fechamento)
        const dia = dataFechamento.getDate()

        if (dia > 25) {
          dataFechamento.setMonth(dataFechamento.getMonth() + 1)
        }

        for (let i = 0; i < 5; i++) {
          const mesParcela = new Date(dataFechamento)
          mesParcela.setMonth(dataFechamento.getMonth() + i)
          const mesKey = mesParcela.toISOString().slice(0, 7)

          const atual = mesesMap.get(mesKey) || 0
          mesesMap.set(mesKey, atual + valorParcela)
        }
      } else {
        const atual = mesesMap.get(mes) || 0
        mesesMap.set(mes, atual + proposta.valor_comissao)
      }
    })

    return Array.from(mesesMap.entries())
      .map(([mes, total]) => ({ mes, total }))
      .sort((a, b) => b.mes.localeCompare(a.mes))
      .slice(0, 6) // Últimos 6 meses
  }

  // KPIs principais
  const mesAtual = new Date().toISOString().slice(0, 7)
  const comissoesMensais = calcularComissoesMensais()
  const comissaoMesAtual = comissoesMensais.find(c => c.mes === mesAtual)?.total || 0

  const totalPropostas = propostas.length
  const valorTotalContratado = propostas.reduce((sum, p) => sum + p.valor_contratado, 0)
  const totalComissoes = propostas.reduce((sum, p) => sum + p.valor_comissao, 0)

  // Propostas recentes
  const propostasRecentes = propostas.slice(0, 5)

  // Formatar mês
  const formatarMes = (mes: string) => {
    const [ano, mesNum] = mes.split('-')
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return `${meses[parseInt(mesNum) - 1]}/${ano.slice(2)}`
  }

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
            <h1>Olá, {userName}! 👋</h1>
            <p>Acompanhe suas comissões e propostas em tempo real</p>
          </div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>
        ) : (
          <>
            {/* CARDS DE KPIs */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
              gap: '20px', 
              marginBottom: '32px' 
            }}>
              {/* Card 1: Comissão do Mês */}
              <div className="content-section" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>
                  Comissão Este Mês
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '4px' }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comissaoMesAtual)}
                </div>
                <div style={{ fontSize: '13px', opacity: 0.8 }}>
                  {formatarMes(mesAtual)}
                </div>
              </div>

              {/* Card 2: Total de Propostas */}
              <div className="content-section">
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontWeight: 500 }}>
                  Total de Propostas
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                  {totalPropostas}
                </div>
                <div style={{ fontSize: '13px', color: '#059669' }}>
                  ✓ Ativas
                </div>
              </div>

              {/* Card 3: Valor Total Contratado */}
              <div className="content-section">
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontWeight: 500 }}>
                  Valor Contratado
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(valorTotalContratado)}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Total acumulado
                </div>
              </div>

              {/* Card 4: Total de Comissões */}
              <div className="content-section">
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontWeight: 500 }}>
                  Total Comissões
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#059669', marginBottom: '4px' }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(totalComissoes)}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Todas as propostas
                </div>
              </div>
            </div>

            {/* GRÁFICO DE EVOLUÇÃO MENSAL */}
            <div className="content-section" style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#111827' }}>
                Evolução de Comissões (Últimos 6 Meses)
              </h3>
              
              {comissoesMensais.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  Nenhuma comissão registrada ainda
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '200px' }}>
                  {comissoesMensais.map(mes => {
                    const maxValor = Math.max(...comissoesMensais.map(m => m.total))
                    const altura = (mes.total / maxValor) * 100

                    return (
                      <div key={mes.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          width: '100%', 
                          height: `${altura}%`, 
                          background: mes.mes === mesAtual 
                            ? 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)' 
                            : '#e5e7eb',
                          borderRadius: '8px 8px 0 0',
                          minHeight: '20px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'center',
                          padding: '8px 4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: mes.mes === mesAtual ? 'white' : '#6b7280'
                        }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(mes.total)}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: mes.mes === mesAtual ? '#667eea' : '#6b7280' }}>
                          {formatarMes(mes.mes)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* PROPOSTAS RECENTES */}
            <div className="content-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                  Propostas Recentes
                </h3>
                <Link 
                  href="/dashboard/propostas"
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#667eea',
                    textDecoration: 'none'
                  }}
                >
                  Ver todas →
                </Link>
              </div>

              {propostasRecentes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
                  <h4 style={{ marginBottom: '8px', color: '#374151' }}>Nenhuma proposta cadastrada</h4>
                  <p style={{ color: '#6b7280', marginBottom: '20px' }}>
                    Comece cadastrando sua primeira proposta
                  </p>
                  <Link
                    href="/dashboard/propostas"
                    style={{
                      display: 'inline-block',
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      borderRadius: '8px',
                      fontWeight: 600,
                      textDecoration: 'none'
                    }}
                  >
                    ➕ Nova Proposta
                  </Link>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ textAlign: 'left', padding: '12px', color: '#6b7280', fontSize: '13px', fontWeight: 600 }}>
                          Nº PROPOSTA
                        </th>
                        <th style={{ textAlign: 'left', padding: '12px', color: '#6b7280', fontSize: '13px', fontWeight: 600 }}>
                          CLIENTE
                        </th>
                        <th style={{ textAlign: 'left', padding: '12px', color: '#6b7280', fontSize: '13px', fontWeight: 600 }}>
                          TIPO
                        </th>
                        <th style={{ textAlign: 'right', padding: '12px', color: '#6b7280', fontSize: '13px', fontWeight: 600 }}>
                          VALOR CONTRATADO
                        </th>
                        <th style={{ textAlign: 'right', padding: '12px', color: '#6b7280', fontSize: '13px', fontWeight: 600 }}>
                          COMISSÃO
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {propostasRecentes.map(proposta => (
                        <tr key={proposta.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '16px', fontWeight: 600, color: '#111827' }}>
                            {proposta.numero_proposta}
                          </td>
                          <td style={{ padding: '16px', color: '#374151' }}>
                            {proposta.nome_cliente}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{
                              padding: '4px 12px',
                              background: '#f0fdf4',
                              color: '#059669',
                              borderRadius: '12px',
                              fontSize: '13px',
                              fontWeight: 600,
                              textTransform: 'capitalize'
                            }}>
                              {proposta.tipo_contrato.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposta.valor_contratado)}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: '#059669', fontSize: '15px' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposta.valor_comissao)}
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