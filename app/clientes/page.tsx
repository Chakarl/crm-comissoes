'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useUsuario } from '@/hooks/useUsuario'
import { formatarNomeProprio } from '@/lib/formatarNome'
import { parsarArquivoClientes, ClienteImportado } from '@/lib/importarClientes'
import {
  Plus,
  Search,
  Users as UsersIcon,
  Pencil,
  Trash2,
  X,
  Loader2,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CalendarDays,
} from 'lucide-react'
import { Paginacao } from '@/components/Paginacao'
import { FiltroMes } from '@/components/FiltroMes'

const POR_PAGINA = 10

interface Cliente {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  agencia: string | null
  conta: string | null
  data_cadastro: string | null
  usuario_id: string | null
}

interface ClienteComData extends Cliente {
  ultimaProposta: string | null
}

const emptyForm = {
  nome: '',
  cpf: '',
  telefone: '',
  agencia: '',
  conta: '',
  data_cadastro: new Date().toISOString().split('T')[0],
}

// ── Máscaras ──
function maskCPF(v: string) {
  return v
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function maskTelefone(v: string) {
  return v
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

export default function ClientesPage() {
  const { usuario, loading: loadingUser } = useUsuario()
  const [clientes, setClientes] = useState<ClienteComData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagina, setPagina] = useState(1)
  const [mesFiltro, setMesFiltro] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<ClienteComData | null>(null)
  const [deletando, setDeletando] = useState<string | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)
  const supabase = createClient()

  const [promotorFiltro, setPromotorFiltro] = useState<string>('todos')
  const [listaPromotores, setListaPromotores] = useState<
    { id: string; nome: string }[]
  >([])

  // ── Estados de filtro por intervalo de datas ──
  const [dataInicio, setDataInicio] = useState<string>('')
  const [dataFim, setDataFim] = useState<string>('')

  // ── Estados de importação ──
  const [showImportModal, setShowImportModal] = useState(false)
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'resultado'>('upload')
  const [importDados, setImportDados] = useState<ClienteImportado[]>([])
  const [importando, setImportando] = useState(false)
  const [importResultado, setImportResultado] = useState<{
    inseridos: number
    duplicados: number
    erros: number
  } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (usuario) {
      if (usuario.is_master) carregarPromotores()
      loadClientes()
    }
  }, [usuario])

  useEffect(() => {
    if (usuario) loadClientes()
  }, [promotorFiltro])

  useEffect(() => {
    setPagina(1)
  }, [search, mesFiltro, dataInicio, dataFim])

  const carregarPromotores = async () => {
    const { data: usuarios } = await supabase.rpc('listar_todos_usuarios')
    if (usuarios) {
      const Promotores = usuarios
        .filter((u: any) => !u.is_master)
        .map((u: any) => ({ id: u.id, nome: u.nome || 'Sem nome' }))
      setListaPromotores(Promotores)
    }
  }

  const loadClientes = async () => {
    if (!usuario) return
    setLoading(true)

    let queryClientes = supabase
      .from('clientes')
      .select('*')
      .order('nome', { ascending: true })

    if (!usuario.is_master) {
      queryClientes = queryClientes.eq('usuario_id', usuario.id)
    } else if (promotorFiltro !== 'todos') {
      queryClientes = queryClientes.eq('usuario_id', promotorFiltro)
    }

    let queryPropostas = supabase
      .from('propostas')
      .select('nome_cliente, data_proposta')

    if (!usuario.is_master) {
      queryPropostas = queryPropostas.eq('usuario_id', usuario.id)
    } else if (promotorFiltro !== 'todos') {
      queryPropostas = queryPropostas.eq('usuario_id', promotorFiltro)
    }

    const { data: clientesData } = await queryClientes
    const { data: propostasData } = await queryPropostas

    const mapaData: Record<string, string> = {}
    if (propostasData) {
      propostasData.forEach((p) => {
        if (!p.nome_cliente || !p.data_proposta) return
        const nome = p.nome_cliente.toLowerCase()
        if (!mapaData[nome] || p.data_proposta > mapaData[nome]) {
          mapaData[nome] = p.data_proposta
        }
      })
    }

    const resultado: ClienteComData[] = (clientesData || []).map((c) => ({
      ...c,
      ultimaProposta: mapaData[c.nome.toLowerCase()] || null,
    }))

    setClientes(resultado)
    setLoading(false)
  }

  const abrirNovo = () => {
    setEditando(null)
    setFormData(emptyForm)
    setErroForm(null)
    setShowModal(true)
  }

  const abrirEditar = (c: ClienteComData) => {
    setEditando(c)
    setFormData({
      nome: c.nome || '',
      cpf: c.cpf || '',
      telefone: c.telefone || '',
      agencia: c.agencia || '',
      conta: c.conta || '',
      data_cadastro: c.data_cadastro || new Date().toISOString().split('T')[0],
    })
    setErroForm(null)
    setShowModal(true)
  }

  const fecharModal = () => {
    setShowModal(false)
    setEditando(null)
    setFormData(emptyForm)
    setErroForm(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuario) return
    setErroForm(null)

    if (!formData.nome.trim()) {
      setErroForm('Nome é obrigatório.')
      return
    }

    const cpfLimpo = formData.cpf.replace(/\D/g, '')
    if (cpfLimpo.length !== 11) {
      setErroForm('CPF é obrigatório (11 dígitos).')
      return
    }

    const cpfMascara = maskCPF(cpfLimpo)
    const nomeFormatado = formatarNomeProprio(formData.nome)

    setSaving(true)

    try {
      if (editando) {
        if (cpfMascara !== editando.cpf) {
          const { data: dup } = await supabase
            .from('clientes')
            .select('id')
            .or(`cpf.eq.${cpfMascara},cpf.eq.${cpfLimpo}`)
            .neq('id', editando.id)
            .limit(1)
            .maybeSingle()

          if (dup) {
            setErroForm('CPF já cadastrado para outro cliente.')
            setSaving(false)
            return
          }
        }

        const { error } = await supabase
          .from('clientes')
          .update({
            nome: nomeFormatado,
            cpf: cpfMascara,
            telefone: formData.telefone.replace(/\D/g, '') || null,
            agencia: formData.agencia || null,
            conta: formData.conta || null,
            data_cadastro: formData.data_cadastro,
          })
          .eq('id', editando.id)

        if (error) {
          setErroForm(error.message)
          setSaving(false)
          return
        }
      } else {
        const { data: dup } = await supabase
          .from('clientes')
          .select('id')
          .or(`cpf.eq.${cpfMascara},cpf.eq.${cpfLimpo}`)
          .limit(1)
          .maybeSingle()

        if (dup) {
          setErroForm('CPF já cadastrado.')
          setSaving(false)
          return
        }

        const { error } = await supabase
          .from('clientes')
          .insert([
            {
              nome: nomeFormatado,
              cpf: cpfMascara,
              telefone: formData.telefone.replace(/\D/g, '') || null,
              agencia: formData.agencia || null,
              conta: formData.conta || null,
              data_cadastro: formData.data_cadastro,
              usuario_id: usuario.id,
            },
          ])

        if (error) {
          setErroForm(error.message)
          setSaving(false)
          return
        }
      }

      fecharModal()
      loadClientes()
    } catch (err: any) {
      setErroForm(err.message || 'Erro inesperado.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletando(id)
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (!error) setClientes((prev) => prev.filter((c) => c.id !== id))
    setDeletando(null)
  }

  // ══════════════════════════════════════
  // ══ IMPORTAÇÃO DE PLANILHA ══
  // ══════════════════════════════════════

  const abrirImport = () => {
    setShowImportModal(true)
    setImportStep('upload')
    setImportDados([])
    setImportResultado(null)
  }

  const fecharImport = () => {
    setShowImportModal(false)
    setImportStep('upload')
    setImportDados([])
    setImportResultado(null)
  }

  const handleArquivo = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const permitidos = ['xlsx', 'xls', 'csv', 'xml']

    if (!ext || !permitidos.includes(ext)) {
      alert('Formato não suportado. Use: .xlsx, .xls, .csv ou .xml')
      return
    }

    try {
      const dados = await parsarArquivoClientes(file)
      if (dados.length === 0) {
        alert('Nenhum registro encontrado no arquivo.')
        return
      }

      // Se retornou um único item com erro de estrutura
      if (dados.length === 1 && !dados[0].valido && !dados[0].nome) {
        alert(dados[0].erro || 'Erro ao ler arquivo.')
        return
      }

      setImportDados(dados)
      setImportStep('preview')
    } catch (err: any) {
      alert('Erro ao ler arquivo: ' + (err.message || 'desconhecido'))
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleArquivo(file)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleArquivo(file)
  }

  const handleImportar = async () => {
    if (!usuario) return
    setImportando(true)

    const validos = importDados.filter((d) => d.valido)
    let inseridos = 0
    let duplicados = 0
    let erros = 0

    for (const cliente of validos) {
      // Checa duplicata no banco
      const cpfLimpo = cliente.cpf.replace(/\D/g, '')
      const { data: dup } = await supabase
        .from('clientes')
        .select('id')
        .or(`cpf.eq.${cliente.cpf},cpf.eq.${cpfLimpo}`)
        .limit(1)
        .maybeSingle()

      if (dup) {
        duplicados++
        continue
      }

      const { error } = await supabase.from('clientes').insert({
        nome: cliente.nome,
        cpf: cliente.cpf,
        telefone: cliente.telefone || null,
        agencia: cliente.agencia || null,
        conta: cliente.conta || null,
        data_cadastro: cliente.data_cadastro || new Date().toISOString().split('T')[0],
        usuario_id: usuario.id,
      })

      if (error) {
        erros++
      } else {
        inseridos++
      }
    }

    const invalidosCount = importDados.filter((d) => !d.valido).length

    setImportResultado({
      inseridos,
      duplicados,
      erros: erros + invalidosCount,
    })
    setImportStep('resultado')
    setImportando(false)
    loadClientes()
  }

  // ── Helpers de layout ──

  const nomePromotorMap: Record<string, string> = {}
  listaPromotores.forEach((c) => {
    nomePromotorMap[c.id] = c.nome
  })

  const datasDisponiveis = clientes
    .map((c) => c.data_cadastro || c.ultimaProposta || '')
    .filter(Boolean)

  const filtered = clientes.filter((c) => {
    const dataRef = c.data_cadastro || c.ultimaProposta || ''
    const matchMes = !mesFiltro || dataRef.startsWith(mesFiltro)

    // ── Filtro por intervalo de datas ──
    const matchInicio = !dataInicio || dataRef >= dataInicio
    const matchFim = !dataFim || dataRef <= dataFim

    const matchSearch =
      c.nome?.toLowerCase().includes(search.toLowerCase()) ||
      c.cpf?.toLowerCase().includes(search.toLowerCase())
    return matchMes && matchInicio && matchFim && matchSearch
  })

  const totalPaginas = Math.ceil(filtered.length / POR_PAGINA)
  const pag = Math.min(pagina, totalPaginas || 1)
  const fatia = filtered.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA)

  const validosCount = importDados.filter((d) => d.valido).length
  const invalidosCountPreview = importDados.filter((d) => !d.valido).length

  if (loadingUser || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Carregando clientes...</div>
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
              Clientes
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              {filtered.length} cliente{filtered.length !== 1 && 's'}
              {search && ` encontrado${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* ✅ Botões de ação */}
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={abrirImport}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base flex-1 sm:flex-none justify-center"
            >
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              Importar Planilha
            </button>
            <button
              onClick={abrirNovo}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base flex-1 sm:flex-none justify-center"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Novo Cliente
            </button>
          </div>
        </div>

        {/* Filtro por Promotor (master only) */}
        {usuario?.is_master && (
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <UsersIcon className="w-4 h-4 text-violet-500" />
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

        {/* Busca */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Filtro por Mês */}
        <FiltroMes
          mesSelecionado={mesFiltro}
          onSelecionar={setMesFiltro}
          datasDisponiveis={datasDisponiveis}
        />

        {/* ── Filtro por Intervalo de Datas ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600 shrink-0">
              <CalendarDays className="w-4 h-4 text-blue-500" />
              <span className="font-medium">Período:</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto"
              />
              <span className="text-sm text-slate-400 hidden sm:inline">até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto"
              />
              {(dataInicio || dataFim) && (
                <button
                  onClick={() => {
                    setDataInicio('')
                    setDataFim('')
                  }}
                  className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Data</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Nome</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">CPF</th>
                {usuario?.is_master && promotorFiltro === 'todos' && (
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Promotor</th>
                )}
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Agência</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Conta</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Telefone</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {fatia.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-700">
                    {c.data_cadastro
                      ? new Date(c.data_cadastro + 'T00:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{c.nome}</td>
                  <td className="px-6 py-4 text-slate-700">{c.cpf || '—'}</td>
                  {usuario?.is_master && promotorFiltro === 'todos' && (
                    <td className="px-6 py-4 text-slate-700">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                        {(c.usuario_id && nomePromotorMap[c.usuario_id]) || '—'}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 text-slate-700">{c.agencia || '—'}</td>
                  <td className="px-6 py-4 text-slate-700">{c.conta || '—'}</td>
                  <td className="px-6 py-4 text-slate-700">{c.telefone || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => abrirEditar(c)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir o cliente "${c.nome}"?`)) handleDelete(c.id)
                        }}
                        disabled={deletando === c.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Excluir"
                      >
                        {deletando === c.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {fatia.length === 0 && (
                <tr>
                  <td
                    colSpan={usuario?.is_master && promotorFiltro === 'todos' ? 9 : 8}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    <UsersIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">Nenhum cliente encontrado</p>
                    <p className="text-sm mt-1">Ajuste os filtros ou cadastre um novo cliente.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3">
          {fatia.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{c.nome}</h3>
                  <p className="text-sm text-slate-500">{c.cpf || 'Sem CPF'}</p>
                  {usuario?.is_master && promotorFiltro === 'todos' && (
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                      {(c.usuario_id && nomePromotorMap[c.usuario_id]) || '—'}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => abrirEditar(c)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir o cliente "${c.nome}"?`)) handleDelete(c.id)
                    }}
                    disabled={deletando === c.id}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  >
                    {deletando === c.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-500">Data</span>
                  <p className="font-medium text-slate-900">
                    {c.data_cadastro
                      ? new Date(c.data_cadastro + 'T00:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Telefone</span>
                  <p className="font-medium text-slate-900">{c.telefone || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Agência</span>
                  <p className="font-medium text-slate-900">{c.agencia || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Conta</span>
                  <p className="font-medium text-slate-900">{c.conta || '—'}</p>
                </div>
              </div>
            </div>
          ))}
          {fatia.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
              <UsersIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">Nenhum cliente encontrado</p>
              <p className="text-sm mt-1">Ajuste os filtros ou cadastre um novo cliente.</p>
            </div>
          )}
        </div>

        {/* Paginação */}
        <Paginacao paginaAtual={pag} totalPaginas={totalPaginas} onMudar={setPagina} />
      </div>

      {/* ══════════════════════════════════════ */}
      {/* ══ MODAL NOVO / EDITAR CLIENTE ══ */}
      {/* ══════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                {editando ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={fecharModal} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {erroForm && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {erroForm}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data *</label>
                <input
                  type="date"
                  required
                  value={formData.data_cadastro}
                  onChange={(e) => setFormData({ ...formData, data_cadastro: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CPF *</label>
                <input
                  type="text"
                  required
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Agência</label>
                  <input
                    type="text"
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Conta</label>
                  <input
                    type="text"
                    value={formData.conta}
                    onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: maskTelefone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editando ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* ══ MODAL IMPORTAR PLANILHA ══ */}
      {/* ══════════════════════════════════════ */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 shrink-0">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Importar Clientes
              </h2>
              <button onClick={fecharImport} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* ── STEP 1: Upload ── */}
              {importStep === 'upload' && (
                <div>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(true)
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                      dragOver
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
                    }`}
                  >
                    <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p className="text-base font-medium text-slate-700 mb-1">
                      Arraste o arquivo aqui ou clique para selecionar
                    </p>
                    <p className="text-sm text-slate-500">
                      Formatos aceitos: <strong>.xlsx</strong>, <strong>.xls</strong>,{' '}
                      <strong>.csv</strong>, <strong>.xml</strong>
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,.xml"
                      onChange={onFileChange}
                      className="hidden"
                    />
                  </div>

                  <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-semibold mb-1">Formato esperado da planilha:</p>
                        <p>
                          A primeira linha deve conter os cabeçalhos. Colunas obrigatórias:{' '}
                          <strong>Nome</strong> e <strong>CPF</strong>.
                        </p>
                        <p className="mt-1">
                          Colunas opcionais: <strong>Telefone</strong>, <strong>Agência</strong>,{' '}
                          <strong>Conta</strong>, <strong>Data</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Preview ── */}
              {importStep === 'preview' && (
                <div>
                  {/* Resumo */}
                  <div className="flex gap-4 mb-4">
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium text-emerald-700">
                        {validosCount} válido{validosCount !== 1 && 's'}
                      </span>
                    </div>
                    {invalidosCountPreview > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="font-medium text-red-700">
                          {invalidosCountPreview} com erro{invalidosCountPreview !== 1 && 's'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tabela preview */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-700">Nome</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-700">CPF</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-700">Telefone</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-700">Agência</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-700">Conta</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-700">Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importDados.map((d, i) => (
                            <tr
                              key={i}
                              className={`border-b border-slate-100 ${
                                !d.valido ? 'bg-red-50/50' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="px-4 py-2.5">
                                {d.valido ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <span className="flex items-center gap-1 text-red-600 text-xs">
                                    <XCircle className="w-4 h-4" />
                                    {d.erro}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-slate-900 font-medium">{d.nome || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-700">{d.cpf || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-700">{d.telefone || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-700">{d.agencia || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-700">{d.conta || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-700">
                                {d.data_cadastro
                                  ? new Date(d.data_cadastro + 'T00:00:00').toLocaleDateString('pt-BR')
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Botões */}
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => {
                        setImportStep('upload')
                        setImportDados([])
                      }}
                      className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleImportar}
                      disabled={importando || validosCount === 0}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {importando && <Loader2 className="w-4 h-4 animate-spin" />}
                      Importar {validosCount} cliente{validosCount !== 1 && 's'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Resultado ── */}
              {importStep === 'resultado' && importResultado && (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
                  <h3 className="text-xl font-bold text-slate-900 mb-6">Importação concluída</h3>

                  <div className="flex justify-center gap-4 mb-8">
                    {importResultado.inseridos > 0 && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-6 py-4 text-center">
                        <p className="text-2xl font-bold text-emerald-700">{importResultado.inseridos}</p>
                        <p className="text-sm text-emerald-600">Inserido{importResultado.inseridos !== 1 && 's'}</p>
                      </div>
                    )}
                    {importResultado.duplicados > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 text-center">
                        <p className="text-2xl font-bold text-amber-700">{importResultado.duplicados}</p>
                        <p className="text-sm text-amber-600">Duplicado{importResultado.duplicados !== 1 && 's'}</p>
                      </div>
                    )}
                    {importResultado.erros > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-center">
                        <p className="text-2xl font-bold text-red-700">{importResultado.erros}</p>
                        <p className="text-sm text-red-600">Erro{importResultado.erros !== 1 && 's'}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={fecharImport}
                    className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}