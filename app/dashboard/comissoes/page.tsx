'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import '../dashboard.css'

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
  propostas: number
}

export default function ComissoesPage() {
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [loading, setLoading] = useState(true)
  const [mesSelecionado, setMesSelecionado] = useState('')
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

      const { data, error } = await supabase
        .from('propostas')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'ativa')
        .order('data_fechamento', { ascending: false })

      if (error) throw error
      setPropostas(data || [])

      // Definir mês atual como padrão
      const mesAtual = new Date().toISOString().slice(0, 7)
      setMesSelecionado(mesAtual)

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

  // Calcular comissões por mês
  const calcularComissoesMensais = (): ComissaoMensal[] => {
    const mesesMap = new Map<string, { total: number; propostas: number }>()

    propostas.forEach(proposta => {
      const mes = proposta.data_fechamento.slice(0, 7)
      const tipo = proposta.tipo_contrato.toLowerCase()

      // Se for consórcio, distribuir em 5 meses
      if (tipo === 'consorcio') {
        const valorParcela = proposta.valor_comissao / 5
        const dataFechamento = new Date(proposta.data_fechamento)
        const dia = dataFechamento.getDate()

        // Se fechou depois do dia 25, começa no mês seguinte
        if (dia > 25) {
          dataFechamento.setMonth(dataFechamento.getMonth() + 1)
        }

        // Distribuir nas 5 parcelas
        for (let i = 0; i < 5; i++) {
          const mesParcela = new Date(dataFechamento)
          mesParcela.setMonth(dataFechamento.getMonth() + i)
          const mesKey = mesParcela.toISOString().slice(0, 7)

          const atual = mesesMap.get(mesKey) || { total: 0, propostas: 0 }
          mesesMap.set(mesKey, {
            total: atual.total + valorParcela,
            propostas: atual.propostas + 1
          })
        }
      } else {
        // Outros contratos: comissão integral no mês de fechamento
        const atual = mesesMap.get(mes) || { total: 0, propostas: 0 }
        mesesMap.set(mes, {
          total: atual.total + proposta.valor_comissao,
          propostas: atual.propostas + 1
        })
      }
    })

    // Converter para array e ordenar
    return Array.from(mesesMap.entries())
      .map(([mes, dados]) => ({
        mes,
        total: dados.total,
        propostas: dados.propostas
      }))
      .sort((a, b) => b.mes.localeCompare(a.mes))
  }

  // Comissões do mês selecionado
  const comissoesMensais = calcularComissoesMensais()
  const comissaoMesAtual = comissoesMensais.find(c => c.mes === mesSelecionado) || { total: 0, propostas: 0 }

  // Comissões por tipo de contrato (apenas mês selecionado)
  const comissoesPorTipo = () => {
    const tipos = new Map<string, number>()

    propostas.forEach(proposta => {
      const mes = proposta.data_fechamento.slice(0, 7)
      const tipo = proposta.tipo_contrato

      if (tipo.toLowerCase() === 'consorcio') {
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

          if (mesKey === mesSelecionado) {
            const atual = tipos.get(tipo) || 0
            tipos.set(tipo, atual + valorParcela)
          }
        }
      } else if (mes === mesSelecionado) {
        const atual = tipos.get(tipo) || 0
        tipos.set(tipo, atual + proposta.valor_comissao)
      }
    })

    return Array.from(tipos.entries()).map(([tipo, valor]) => ({ tipo, valor }))
  }

  const tiposComissao = comissoesPorTipo()

  // Formatar mês para exibição
  const formatarMes = (mes: string) => {
    const [ano, mesNum] = mes.split('-')
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return `${meses[parseInt(mesNum) - 1]}/${ano}`
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
          <Link href="/dashboard/comissoes" className="sidebar-item active">
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
            <h1>Comissões</h1>
            <p>Acompanhe suas comissões mensais e por tipo de contrato</p>
          </div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>
        ) : (
          <>
            {/* SELETOR DE MÊS */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                Mês de Referência
              </label>
              <select
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(e.target.value)}
                style={{
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: 'white'
                }}
              >
                {comissoesMensais.map(mes => (
                  <option key={mes.mes} value={mes.mes}>
                    {formatarMes(mes.mes)}
                  </option>
                ))}
              </select>
            </div>

            {/* CARD TOTAL DO MÊS */}
            <div className="content-section" style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '16px', opacity: 0.9, marginBottom: '8px' }}>
                Total de Comissões - {formatarMes(mesSelecionado)}
              </h3>
              <div style={{ fontSize: '42px', fontWeight: 700, marginBottom: '8px' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comissaoMesAtual.total)}
              </div>
              <p style={{ opacity: 0.9, fontSize: '15px' }}>
                {comissaoMesAtual.propostas} proposta{comissaoMesAtual.propostas !== 1 ? 's' : ''}
              </p>
            </div>

            {/* COMISSÕES POR TIPO */}
            <div className="content-section" style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#111827' }}>
                Comissões por Tipo de Contrato
              </h3>

              {tiposComissao.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  Nenhuma comissão neste mês
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {tiposComissao.map(({ tipo, valor }) => (
                    <div key={tipo} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: '#111827', textTransform: 'capitalize' }}>
                          {tipo.replace('_', ' ')}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '18px', color: '#059669' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* HISTÓRICO MENSAL */}
            <div className="content-section">
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#111827' }}>
                Histórico Mensal
              </h3>

              {comissoesMensais.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  Nenhuma comissão registrada ainda
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ textAlign: 'left', padding: '12px', color: '#6b7280', fontSize: '13px', fontWeight: 600 }}>
                          MÊS
                        </th>
                        <th style={{ textAlign: 'center', padding: '12px', color: '#6b7280', fontSize: '13px', fontWeight: 600 }}>
                          PROPOSTAS
                        </th>
                        <th style={{ textAlign: 'right', padding: '12px', color: '#6b7280', fontSize: '13px', fontWeight: 600 }}>
                          TOTAL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {comissoesMensais.map(mes => (
                        <tr key={mes.mes} style={{ 
                          borderBottom: '1px solid #f3f4f6',
                          background: mes.mes === mesSelecionado ? '#f0fdf4' : 'transparent'
                        }}>
                          <td style={{ padding: '16px', fontWeight: 600, color: '#111827' }}>
                            {formatarMes(mes.mes)}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                            {mes.propostas}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: '#059669', fontSize: '16px' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mes.total)}
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