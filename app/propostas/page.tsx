'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useUsuario } from '@/hooks/useUsuario'
import Link from 'next/link'
import { Plus, Search, FileText, Pencil, Trash2, Users, CalendarDays, X, Filter } from 'lucide-react'
import { Paginacao } from '@/components/Paginacao'
import { FiltroMes } from '@/components/FiltroMes'

const POR_PAGINA = 10

interface Proposta {
  id: string
  numero_proposta: string
  tipo_proposta_codigo: string
  data_proposta: string
  nome_cliente: string
  valor_contratado: number
  valor_parcela: number | null
  prazo: number | null
  comissao_total: number
  usuario_id: string
}

interface TipoProposta {
  codigo: string
  nome: string
  categoria: string
}

export default function PropostasPage() {
  const { usuario, loading: loadingUser } = useUsuario()
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [loading, setLoading] = useState(true)
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [pagina, setPagina] = useState(1)
  const [mesFiltro, setMesFiltro] = useState<string | null>(null)
  const supabase = createClient()

  // ── Filtro por Promotor (master only) ──
  const [promotorFiltro, setPromotorFiltro] = useState<string>('todos')
  const [listaPromotores, setListaPromotores] = useState<{ id: string; nome: string }[]>([])

  // ── Filtro por intervalo de datas ──
  const [dataInicio, setDataInicio] = useState<string>('')
  const [dataFim, setDataFim] = useState<string>('')

  // ── Filtro por tipo de proposta (dinâmico) ──
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos')
  const [listaTipos, setListaTipos] = useState<TipoProposta[]>([])

  useEffect(() => {
    if (usuario) {
      if (usuario.is_master) carregarPromotores()
      carregarTipos()
      loadPropostas()
    }
  }, [usuario])

  // Recarrega propostas quando muda o filtro de Promotor
  useEffect(() => {
    if (usuario) loadPropostas()
  }, [promotorFiltro])

  useEffect(() => {
    setPagina(1)
  }, [search, mesFiltro, dataInicio, dataFim, tipoFiltro])

  const carregarPromotores = async () => {
    const { data: usuarios } = await supabase.rpc('listar_todos_usuarios')
    if (usuarios) {
      const promotores = usuarios
        .filter((u: any) => !u.is_master)
        .map((u: any) => ({ id: u.id, nome: u.nome || 'Sem nome' }))
      setListaPromotores(promotores)
    }
  }

  const carregarTipos = async () => {
    const { data, error } = await supabase
      .from('tipos_proposta')
      .select('codigo, nome, categoria')
      .order('categoria, nome')
    if (data) setListaTipos(data)
    if (error) console.error('Erro ao carregar tipos:', error)
  }

  const loadPropostas = async () => {
    if (!usuario) return
    setLoading(true)
    setErroCarregamento(null)

    let queryComParcela = supabase
      .from('propostas')
      .select('id, numero_proposta, tipo_proposta_codigo, data_proposta, nome_cliente, valor_contratado, valor_parcela, prazo, comissao_total, usuario_id')
      .order('data_proposta', { ascending: false })

    if (!usuario.is_master) {
      queryComParcela = queryComParcela.eq('usuario_id', usuario.id)
    } else if (promotorFiltro !== 'todos') {
      queryComParcela = queryComParcela.eq('usuario_id', promotorFiltro)
    }    const resultado = await queryComParcela

    if (!resultado.error) {
      setPropostas(resultado.data || [])
      setLoading(false)
      return
    }

    const colunaParcelaAusente = resultado.error.message.includes('valor_parcela') &&
      (resultado.error.code === '42703' || resultado.error.code === 'PGRST204')

    if (colunaParcelaAusente) {
      let querySemParcela = supabase
        .from('propostas')
        .select('id, numero_proposta, tipo_proposta_codigo, data_proposta, nome_cliente, valor_contratado, prazo, comissao_total, usuario_id')
        .order('data_proposta', { ascending: false })

      if (!usuario.is_master) {
        querySemParcela = querySemParcela.eq('usuario_id', usuario.id)
      } else if (promotorFiltro !== 'todos') {
        querySemParcela = querySemParcela.eq('usuario_id', promotorFiltro)
      }      const resultadoLegado = await querySemParcela

      if (!resultadoLegado.error) {
        setPropostas((resultadoLegado.data || []).map((proposta) => ({
          ...proposta,
          valor_parcela: null,
        })))
        setErroCarregamento('As propostas foram carregadas, mas a coluna de parcela ainda não existe no banco. Aplique a migração do consignado para ativar a margem e o valor da parcela.')
        setLoading(false)
        return
      }

      console.error('Erro ao carregar propostas sem a coluna de parcela:', resultadoLegado.error)
      setPropostas([])
      setErroCarregamento(`Não foi possível carregar propostas: ${resultadoLegado.error.message}`)
      setLoading(false)
      return
    }

    console.error('Erro ao carregar propostas:', resultado.error)
    setPropostas([])
    setErroCarregamento(`Não foi possível carregar propostas: ${resultado.error.message}`)
    setLoading(false)
  }
  // ═══════════════════════════════════════════════════════════
  //  EXCLUSÃO — remove só parcelas pendentes, mantém as pagas
  // ═══════════════════════════════════════════════════════════
  const handleDelete = async (id: string, numero: string) => {
    // 1. Buscar parcelas vinculadas à proposta
    const { data: parcelas } = await supabase
      .from('parcelas_comissao')
      .select('id, pago')
      .eq('proposta_id', id)

    const pagas = parcelas?.filter((p) => p.pago === true) ?? []
    const pendentes = parcelas?.filter((p) => !p.pago) ?? []

    // 2. Montar mensagem de confirmação
    let msg = `Excluir proposta ${numero}?\n`
    if (pendentes.length > 0) {
      msg += `\n→ ${pendentes.length} parcela(s) pendente(s) serão removidas.`
    }
    if (pagas.length > 0) {
      msg += `\n→ ${pagas.length} parcela(s) já paga(s) serão mantidas.`
    }

    if (!confirm(msg)) return

    // 3. Deletar apenas parcelas NÃO pagas
    if (pendentes.length > 0) {
      const idsPendentes = pendentes.map((p) => p.id)
      await supabase
        .from('parcelas_comissao')
        .delete()
        .in('id', idsPendentes)
    }

    // 4. Se não sobrou nenhuma parcela paga → exclui a proposta também
    //    Se tem parcelas pagas → mantém a proposta no banco
    if (pagas.length === 0) {
      const { error } = await supabase.from('propostas').delete().eq('id', id)
      if (error) {
        alert('Erro ao excluir: ' + error.message)
        return
      }
      setPropostas((prev) => prev.filter((p) => p.id !== id))
    } else {
      alert(
        `Parcelas pendentes removidas.\nA proposta foi mantida porque possui ${pagas.length} parcela(s) já paga(s).`
      )
    }
  }

  // Mapa de nomes dos promotores para exibição
  const nomePromotorMap: Record<string, string> = {}
  listaPromotores.forEach((c) => { nomePromotorMap[c.id] = c.nome })

  // Mapa código → nome do tipo para exibição legível
  const nomeTipoMap: Record<string, string> = {}
  listaTipos.forEach((t) => { nomeTipoMap[t.codigo] = t.nome })

  // Agrupa tipos por categoria para o select
  const tiposPorCategoria = listaTipos.reduce<Record<string, TipoProposta[]>>((acc, t) => {
    if (!acc[t.categoria]) acc[t.categoria] = []
    acc[t.categoria].push(t)
    return acc
  }, {})

  const filtered = propostas.filter((p) => {
    const matchMes = !mesFiltro || p.data_proposta?.startsWith(mesFiltro)

    // ── Filtro por intervalo de datas ──
    let matchIntervalo = true
    if (dataInicio && p.data_proposta) {
      matchIntervalo = p.data_proposta >= dataInicio
    }
    if (dataFim && p.data_proposta && matchIntervalo) {
      matchIntervalo = p.data_proposta <= dataFim
    }
    if ((dataInicio || dataFim) && !p.data_proposta) {
      matchIntervalo = false
    }

    // ── Filtro por tipo de proposta ──
    const matchTipo = tipoFiltro === 'todos' || p.tipo_proposta_codigo === tipoFiltro

    const matchSearch =
      p.numero_proposta?.toLowerCase().includes(search.toLowerCase()) ||
      p.nome_cliente?.toLowerCase().includes(search.toLowerCase())

    return matchMes && matchIntervalo && matchTipo && matchSearch
  })

  const totalPaginas = Math.ceil(filtered.length / POR_PAGINA)
  const pag = Math.min(pagina, totalPaginas || 1)
  const fatia = filtered.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA)

  if (loadingUser || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Carregando propostas...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">
              Propostas
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              {filtered.length} proposta{filtered.length !== 1 && 's'}
              {search && ` encontrada${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Link
            href="/propostas/nova"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Nova Proposta
          </Link>
        </div>

        {erroCarregamento && (
          <div role="alert" className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="text-sm font-medium">{erroCarregamento}</p>
            <button
              onClick={loadPropostas}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
            >
              Tentar novamente
            </button>
          </div>
        )}
        {/* ── Filtro por Promotor (master only) ── */}
        {usuario?.is_master && (
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users className="w-4 h-4 text-violet-500" />
              <span className="font-medium">Promotor:</span>
            </div>
            <select
              value={promotorFiltro}
              onChange={(e) => {
                setPromotorFiltro(e.target.value)
                setPagina(1)
              }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todos os Promotores</option>
              {listaPromotores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Busca + Filtro por Tipo */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por número ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>

            {/* Filtro por tipo (dinâmico, agrupado por categoria) */}
            <div className="relative min-w-[220px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="todos">Todos os tipos</option>
                {Object.entries(tiposPorCategoria).map(([categoria, tipos]) => (
                  <optgroup key={categoria} label={categoria}>
                    {tipos.map((t) => (
                      <option key={t.codigo} value={t.codigo}>
                        {t.nome}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Filtro por Mês */}
        <FiltroMes
          mesSelecionado={mesFiltro}
          onSelecionar={setMesFiltro}
          datasDisponiveis={propostas.map((p) => p.data_proposta)}
        />

        {/* ── Filtro por Intervalo de Datas ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CalendarDays className="w-4 h-4 text-blue-500" />
              <span className="font-medium">Período:</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto"
              />
              <span className="text-sm text-slate-400 hidden sm:inline">até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto"
              />
              {(dataInicio || dataFim) && (
                <button
                  onClick={() => {
                    setDataInicio('')
                    setDataFim('')
                  }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {fatia.map((p) => (
            <article key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-slate-500">#{p.numero_proposta}</span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {nomeTipoMap[p.tipo_proposta_codigo] || p.tipo_proposta_codigo}
                    </span>
                  </div>
                  <h3 className="font-semibold text-base sm:text-lg text-slate-900">{p.nome_cliente}</h3>
                  {usuario?.is_master && promotorFiltro === 'todos' && (
                    <p className="text-sm text-slate-500 mt-0.5">Promotor: {nomePromotorMap[p.usuario_id] || '—'}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Link href={'/propostas/' + p.id + '/editar'} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button onClick={() => handleDelete(p.id, p.numero_proposta)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm sm:text-base">
                <div><span className="text-slate-500">Data:</span>{' '}<span className="text-slate-700">{new Date(p.data_proposta + 'T00:00:00').toLocaleDateString('pt-BR')}</span></div>
                <div><span className="text-slate-500">Valor:</span>{' '}<span className="text-slate-700">{p.valor_contratado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                {p.valor_parcela != null && (
                  <div><span className="text-slate-500">Parcela:</span>{' '}<span className="text-slate-700">{p.valor_parcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                )}
                <div><span className="text-slate-500">Comiss&atilde;o:</span>{' '}<span className="font-semibold text-emerald-600">{p.comissao_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              </div>
            </article>
          ))}
          {fatia.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 shadow-sm">
              Nenhuma proposta encontrada.
            </div>
          )}
        </div>


        {totalPaginas > 1 && (
          <div className="mt-6">
            <Paginacao
              paginaAtual={pag}
              totalPaginas={totalPaginas}
              onMudar={setPagina}
            />
          </div>
        )}
      </div>
    </div>
  )
}