'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

type TipoProposta = { id: number; codigo: string; nome: string; categoria: string }
type Proposta = {
  id: number
  numero_proposta: string
  data_fechamento: string
  tipo_proposta_codigo: string
  nome_cliente: string
  valor_contratado: number
  taxa_juros: number
  prazo_meses: number
  comissao_pct: number
  comissao_valor: number
  tipos_proposta?: TipoProposta
}
type ParcelaConsorcio = {
  id: number
  proposta_id: number
  mes_referencia: string
  valor_parcela: number
}

export default function Home() {
  const [tipos, setTipos] = useState<TipoProposta[]>([])
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [parcelas, setParcelas] = useState<ParcelaConsorcio[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'cadastro' | 'lista' | 'parcelas'>('cadastro')
  const [usuarioAtual, setUsuarioAtual] = useState<any>(null)
  const router = useRouter()

  const [form, setForm] = useState({
    numero_proposta: '',
    data_fechamento: new Date().toISOString().split('T')[0],
    tipo_proposta_codigo: '',
    nome_cliente: '',
    valor_contratado: '',
    taxa_juros: '',
    prazo_meses: '',
  })

  const [resultado, setResultado] = useState<{pct: number; valor: number} | null>(null)

  useEffect(() => {
    const user = localStorage.getItem('usuario')
    if (!user) {
      router.push('/login')
      return
    }
    
    setUsuarioAtual(JSON.parse(user))
    carregarTipos()
    carregarPropostas()
    carregarParcelas()
  }, [])

  async function carregarTipos() {
    const { data } = await supabase.from('tipos_proposta').select('*').order('categoria')
    if (data) setTipos(data)
  }

  async function carregarPropostas() {
    const { data } = await supabase
      .from('propostas')
      .select('*, tipos_proposta(*)')
      .order('data_fechamento', { ascending: false })
    if (data) setPropostas(data)
  }

  async function carregarParcelas() {
    const { data } = await supabase
      .from('parcelas_consorcio')
      .select('*')
      .order('mes_referencia')
    if (data) setParcelas(data)
  }

  async function buscarComissao() {
    const { tipo_proposta_codigo, valor_contratado, taxa_juros, prazo_meses } = form
    const valor = parseFloat(valor_contratado)
    const taxa = parseFloat(taxa_juros)
    const prazo = parseInt(prazo_meses)

    if (!tipo_proposta_codigo || !valor || !taxa) return

    let query = supabase
      .from('tabela_comissao')
      .select('*')
      .eq('tipo_proposta_codigo', tipo_proposta_codigo)
      .lte('taxa_min', taxa)
      .gte('taxa_max', taxa)

    if (prazo) {
      query = query.lte('prazo_min', prazo).gte('prazo_max', prazo)
    }

    const { data } = await query.limit(1)

    if (data && data.length > 0) {
      const faixa = data[0]
      if (faixa.comissao_fixa) {
        setResultado({ pct: 0, valor: faixa.comissao_fixa })
      } else {
        const pct = faixa.comissao_pct
        const comissaoValor = (valor * pct) / 100
        setResultado({ pct, valor: comissaoValor })
      }
    } else {
      setResultado(null)
      alert('Nenhuma faixa de comissão encontrada para esses parâmetros.')
    }
  }

  async function salvarProposta() {
    if (!resultado) {
      alert('Calcule a comissão antes de salvar.')
      return
    }
    setLoading(true)

    const valor = parseFloat(form.valor_contratado)
    const proposta = {
      numero_proposta: form.numero_proposta,
      data_fechamento: form.data_fechamento,
      tipo_proposta_codigo: form.tipo_proposta_codigo,
      nome_cliente: form.nome_cliente,
      valor_contratado: valor,
      taxa_juros: parseFloat(form.taxa_juros),
      prazo_meses: parseInt(form.prazo_meses) || null,
      comissao_pct: resultado.pct,
      comissao_valor: resultado.valor,
      usuario_id: usuarioAtual?.id
    }

    const { data, error } = await supabase.from('propostas').insert(proposta).select()

    if (error) {
      alert('Erro ao salvar: ' + error.message)
      setLoading(false)
      return
    }

    const tipo = form.tipo_proposta_codigo
    if (tipo === 'CONSORCIO_IMOVEL' || tipo === 'CONSORCIO_GERAL') {
      if (data && data[0]) {
        await distribuirConsorcio(data[0].id, resultado.valor, form.data_fechamento)
      }
    }

    setForm({
      numero_proposta: '',
      data_fechamento: new Date().toISOString().split('T')[0],
      tipo_proposta_codigo: '',
      nome_cliente: '',
      valor_contratado: '',
      taxa_juros: '',
      prazo_meses: '',
    })
    setResultado(null)
    await carregarPropostas()
    await carregarParcelas()
    setLoading(false)
    alert('Proposta salva com sucesso!')
  }

  async function distribuirConsorcio(propostaId: number, comissaoTotal: number, dataFechamento: string) {
    const parcela = comissaoTotal / 5
    const dt = new Date(dataFechamento + 'T12:00:00')
    const dia = dt.getDate()

    let mesInicio = new Date(dt.getFullYear(), dt.getMonth(), 1)
    if (dia > 25) {
      mesInicio.setMonth(mesInicio.getMonth() + 1)
    }

    const parcelas = []
    for (let i = 0; i < 5; i++) {
      const mesRef = new Date(mesInicio)
      mesRef.setMonth(mesRef.getMonth() + i)
      parcelas.push({
        proposta_id: propostaId,
        mes_referencia: mesRef.toISOString().split('T')[0].slice(0, 7) + '-01',
        valor_parcela: Math.round(parcela * 100) / 100,
      })
    }

    await supabase.from('parcelas_consorcio').insert(parcelas)
  }

  async function handleLogout() {
    const token = localStorage.getItem('token')
    
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
    }

    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    router.push('/login')
  }

  function formatCurrency(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const parcelasPorMes = parcelas.reduce((acc, p) => {
    const mes = p.mes_referencia.slice(0, 7)
    acc[mes] = (acc[mes] || 0) + p.valor_parcela
    return acc
  }, {} as Record<string, number>)

  if (!usuarioAtual) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white text-xl">Carregando...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header com Logout e Gerenciar Usuários */}
      <header className="bg-gray-900 p-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">CRM Comissões</h1>
            <p className="text-sm text-gray-400">
              Logado como: <span className="text-white">{usuarioAtual.nome}</span>
              {usuarioAtual.is_master && (
                <span className="ml-2 bg-yellow-600 px-2 py-0.5 rounded text-xs font-bold">
                  MASTER
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-3">
            {usuarioAtual.is_master && (
              <button
                onClick={() => router.push('/usuarios')}
                className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Gerenciar Usuários
              </button>
            )}

            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-gray-900 p-2 rounded-xl">
          <button
            onClick={() => setTab('cadastro')}
            className={`flex-1 py-3 rounded-lg font-medium transition ${
              tab === 'cadastro' ? 'bg-blue-600' : 'hover:bg-gray-800'
            }`}
          >
            Cadastrar Proposta
          </button>
          <button
            onClick={() => setTab('lista')}
            className={`flex-1 py-3 rounded-lg font-medium transition ${
              tab === 'lista' ? 'bg-blue-600' : 'hover:bg-gray-800'
            }`}
          >
            Lista de Propostas
          </button>
          <button
            onClick={() => setTab('parcelas')}
            className={`flex-1 py-3 rounded-lg font-medium transition ${
              tab === 'parcelas' ? 'bg-blue-600' : 'hover:bg-gray-800'
            }`}
          >
            Parcelas Consórcio
          </button>
        </div>

        {/* TAB: CADASTRO */}
        {tab === 'cadastro' && (
          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">Nova Proposta</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Nº Proposta</label>
                <input
                  type="text"
                  value={form.numero_proposta}
                  onChange={(e) => setForm({ ...form, numero_proposta: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Data Fechamento</label>
                <input
                  type="date"
                  value={form.data_fechamento}
                  onChange={(e) => setForm({ ...form, data_fechamento: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Tipo de Proposta</label>
                <select
                  value={form.tipo_proposta_codigo}
                  onChange={(e) => setForm({ ...form, tipo_proposta_codigo: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                  required
                >
                  <option value="">Selecione...</option>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.codigo}>
                      {t.categoria} — {t.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Nome do Cliente</label>
                <input
                  type="text"
                  value={form.nome_cliente}
                  onChange={(e) => setForm({ ...form, nome_cliente: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Valor Contratado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.valor_contratado}
                  onChange={(e) => setForm({ ...form, valor_contratado: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Taxa de Juros (% a.m.)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.taxa_juros}
                  onChange={(e) => setForm({ ...form, taxa_juros: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Prazo (meses)</label>
                <input
                  type="number"
                  value={form.prazo_meses}
                  onChange={(e) => setForm({ ...form, prazo_meses: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={buscarComissao}
                className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-semibold transition"
              >
                Calcular Comissão
              </button>

              {resultado && (
                <button
                  onClick={salvarProposta}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 px-6 py-3 rounded-lg font-semibold transition"
                >
                  {loading ? 'Salvando...' : 'Salvar Proposta'}
                </button>
              )}
            </div>

            {resultado && (
              <div className="mt-6 bg-green-900/30 border border-green-500 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-3">Resultado da Comissão</h3>
                {resultado.pct > 0 && (
                  <p className="text-lg mb-2">
                    Percentual: <strong>{resultado.pct.toFixed(2)}%</strong>
                  </p>
                )}
                <p className="text-2xl font-bold text-green-400">
                  Valor: {formatCurrency(resultado.valor)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB: LISTA */}
        {tab === 'lista' && (
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-xl font-bold">Propostas Cadastradas</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="text-left p-4">Nº Proposta</th>
                    <th className="text-left p-4">Cliente</th>
                    <th className="text-left p-4">Tipo</th>
                    <th className="text-right p-4">Valor</th>
                    <th className="text-right p-4">Comissão</th>
                    <th className="text-center p-4">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {propostas.map((p) => (
                    <tr key={p.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                      <td className="p-4 font-mono">{p.numero_proposta}</td>
                      <td className="p-4">{p.nome_cliente}</td>
                      <td className="p-4 text-sm text-gray-400">
                        {p.tipos_proposta?.nome}
                      </td>
                      <td className="p-4 text-right">{formatCurrency(p.valor_contratado)}</td>
                      <td className="p-4 text-right font-bold text-green-400">
                        {formatCurrency(p.comissao_valor)}
                      </td>
                      <td className="p-4 text-center text-sm text-gray-400">
                        {new Date(p.data_fechamento).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: PARCELAS */}
        {tab === 'parcelas' && (
          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">Parcelas de Consórcio por Mês</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(parcelasPorMes)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([mes, total]) => (
                  <div key={mes} className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">
                      {new Date(mes + '-01').toLocaleDateString('pt-BR', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-2xl font-bold text-green-400">
                      {formatCurrency(total)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}