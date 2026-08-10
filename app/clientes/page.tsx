'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
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

// ── Tipos do modal de importação ──
type ImportStatus = 'idle' | 'parsing' | 'preview' | 'importing' | 'done'

interface ResultadoImport {
  total: number
  inseridos: number
  duplicados: number
  invalidos: number
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

  // ── Estado do modal de importação ──
  const [showImportModal, setShowImportModal] = useState(false)
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle')
  const [importData, setImportData] = useState<ClienteImportado[]>([])
  const [importResult, setImportResult] = useState<ResultadoImport | null>(null)
  const [importErro, setImportErro] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
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
  }, [search, mesFiltro])

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

    if (!formData.data_cadastro) {
      setErroForm('Data é obrigatória.')
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
          .insert([{
            nome: nomeFormatado,
            cpf: cpfMascara,
            telefone: formData.telefone.replace(/\D/g, '') || null,
            agencia: formData.agencia || null,
            conta: formData.conta || null,
            data_cadastro: formData.data_cadastro,
            usuario_id: usuario.id,
          }])

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

  // ══════════════════════════════════════════════
  // ── IMPORTAÇÃO EM LOTE ──
  // ══════════════════════════════════════════════

  const abrirImportModal = () => {
    setShowImportModal(true)
    setImportStatus('idle')
    setImportData([])
    setImportResult(null)
    setImportErro(null)
  }

  const fecharImportModal = () => {
    setShowImportModal(false)
    setImportStatus('idle')
    setImportData([])
    setImportResult(null)
    setImportErro(null)
  }

  const processarArquivo = useCallback(async (file: File) => {
    const extensoesValidas = ['xlsx', 'xls', 'csv', 'xml']
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (!ext || !extensoesValidas.includes(ext)) {
      setImportErro('Formato inválido. Use .xlsx, .xls, .csv ou .xml')
      return
    }

    setImportErro(null)
    setImportStatus('parsing')

    try {
      const dados = await parsarArquivoClientes(file)

      if (dados.length === 0) {
        setImportErro('Nenhum registro encontrado no arquivo.')
        setImportStatus('idle')
        return
      }

      // Se retornou só 1 item com erro de estrutura
      if (dados.length === 1 && !dados[0].valido && !dados[0].nome) {
        setImportErro(dados[0].erro || 'Erro ao ler arquivo.')
        setImportStatus('idle')
        return
      }

      setImportData(dados)
      setImportStatus('preview')
    } catch (err: any) {
      setImportErro(err.message || 'Erro ao processar arquivo.')
      setImportStatus('idle')
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processarArquivo(file)
    // Reset input pra poder selecionar o mesmo arquivo de novo
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processarArquivo(file)
  }, [processarArquivo])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragging(false)
  }, [])

  const importarClientes = async () => {
    if (!usuario) return

    const validos = importData.filter((c) => c.valido)
    if (validos.length === 0) return

    setImportStatus('importing')

    let inseridos = 0
    let duplicados = 0
    const invalidos = importData.filter((c) => !c.valido).length

    for (const cliente of validos) {
      // Verifica duplicata no banco
      const cpfLimpo = cliente.cpf.replace(/\D/g, '')
      const { data: existe } = await supabase
        .from('clientes')
        .select('id')
        .or(`cpf.eq.${cliente.cpf},cpf.eq.${cpfLimpo}`)
        .limit(1)
        .maybeSingle()

      if (existe) {
        duplicados++
        continue
      }

      const { error } = await supabase
        .from('clientes')
        .insert({
          nome: cliente.nome,
          cpf: cliente.cpf,
          telefone: cliente.telefone || null,
          agencia: cliente.agencia || null,
          conta: cliente.conta || null,
          data_cadastro: cliente.data_cadastro || new Date().toISOString().split('T')[0],
          usuario_id: usuario.id,
        })

      if (!error) {
        inseridos++
      } else {
        duplicados++ // provavelmente unique constraint
      }
    }

    setImportResult({
      total: importData.length,
      inseridos,
      duplicados,
      invalidos,
    })
    setImportStatus('done')
    loadClientes()
  }

  // ══════════════════════════════════════════════
  // ── FILTROS E PAGINAÇÃO (restante do seu código original) ──
  // ══════════════════════════════════════════════

  const nomePromotorMap: Record<string, string> = {}
  listaPromotores.forEach((c) => {
    nomePromotorMap[c.id] = c.nome
  })

  const filtrados = clientes.filter((c) => {
    const termoBusca = search.toLowerCase()
    const matchBusca =
      !search ||
      c.nome.toLowerCase().includes(termoBusca) ||
      (c.cpf && c.cpf.includes(termoBusca))

    const matchMes =
      !mesFiltro ||
      (c.data_cadastro && c.data_cadastro.startsWith(mesFiltro))

    return matchBusca && matchMes
  })

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA)
  const clientesPaginados = filtrados.slice(
    (pagina - 1) * POR_PAGINA,
    pagina * POR_PAGINA
  )

  const validosCount = importData.filter((c) => c.valido).length
  const invalidosCount = importData.filter((c) => !c.valido).length

  // ══════════════════════════════════════════════
  // ── RENDER ──
  // ══════════════════════════════════════════════

  if (loadingUser || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UsersIcon className="w-7 h-7 text-blue-600" />
            Clientes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={abrirImportModal}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Importar Planilha
          </button>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <FiltroMes value={mesFiltro} onChange={setMesFiltro} />

        {usuario?.is_master && listaPromotores.length > 0 && (
          <select
            value={promotorFiltro}
            onChange={(e) => setPromotorFiltro(e.target.value)}
            className="border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os promotores</option>
            {listaPromotores.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── Tabela de clientes ── */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">CPF</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Telefone</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Agência</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Conta</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Data</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clientesPaginados.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{c.cpf || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.telefone || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.agencia || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.conta || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.data_cadastro
                      ? new Date(c.data_cadastro + 'T00:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => abrirEditar(c)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deletando === c.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

              {clientesPaginados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPaginas > 1 && (
        <Paginacao
          paginaAtual={pagina}
          totalPaginas={totalPaginas}
          onChange={setPagina}
        />
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* ── MODAL CADASTRO / EDIÇÃO ── */}
      {/* ══════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                {editando ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={fecharModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {erroForm && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {erroForm}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.data_cadastro}
                  onChange={(e) => setFormData({ ...formData, data_cadastro: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agência</label>
                  <input
                    type="text"
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conta</label>
                  <input
                    type="text"
                    value={formData.conta}
                    onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="00000-0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: maskTelefone(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="flex-1 border rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editando ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* ── MODAL IMPORTAÇÃO ── */}
      {/* ══════════════════════════════════════════════ */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Importar Clientes
              </h2>
              <button onClick={fecharImportModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">

              {/* ── ESTADO: Idle (upload) ── */}
              {importStatus === 'idle' && (
                <div className="space-y-4">
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                      dragging
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'
                    }`}
                  >
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700">
                      Arraste o arquivo aqui ou <span className="text-emerald-600 underline">clique para selecionar</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Formatos: .xlsx, .xls, .csv, .xml
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.xml"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {importErro && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                      <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      {importErro}
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
                    <p className="font-medium mb-1">Colunas esperadas na planilha:</p>
                    <p>
                      <strong>Data</strong> (obrigatória), <strong>Nome</strong> (obrigatório),{' '}
                      <strong>CPF</strong> (obrigatório), Agência, Conta, Telefone
                    </p>
                  </div>
                </div>
              )}

              {/* ── ESTADO: Parsing ── */}
              {importStatus === 'parsing' && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
                  <p className="text-sm text-gray-600">Lendo arquivo...</p>
                </div>
              )}

              {/* ── ESTADO: Preview ── */}
              {importStatus === 'preview' && (
                <div className="space-y-4">
                  {/* Resumo */}
                  <div className="flex gap-3">
                    <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{validosCount}</p>
                      <p className="text-xs text-emerald-600">Válidos</p>
                    </div>
                    <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-700">{invalidosCount}</p>
                      <p className="text-xs text-red-600">Inválidos</p>
                    </div>
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-gray-700">{importData.length}</p>
                      <p className="text-xs text-gray-600">Total</p>
                    </div>
                  </div>

                  {/* Tabela preview */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600">Data</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600">Nome</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600">CPF</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600">Agência</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600">Conta</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600">Telefone</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600">Erro</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {importData.map((c, i) => (
                            <tr
                              key={i}
                              className={c.valido ? 'bg-white' : 'bg-red-50'}
                            >
                              <td className="px-3 py-2">
                                {c.valido ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {c.data_cadastro
                                  ? new Date(c.data_cadastro + 'T00:00:00').toLocaleDateString('pt-BR')
                                  : '—'}
                              </td>
                              <td className="px-3 py-2 font-medium text-gray-900">{c.nome || '—'}</td>
                              <td className="px-3 py-2 text-gray-600">{c.cpf || '—'}</td>
                              <td className="px-3 py-2 text-gray-600">{c.agencia || '—'}</td>
                              <td className="px-3 py-2 text-gray-600">{c.conta || '—'}</td>
                              <td className="px-3 py-2 text-gray-600">{c.telefone || '—'}</td>
                              <td className="px-3 py-2 text-red-600">{c.erro || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {importErro && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                      {importErro}
                    </div>
                  )}
                </div>
              )}

              {/* ── ESTADO: Importando ── */}
              {importStatus === 'importing' && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
                  <p className="text-sm text-gray-600">Importando {validosCount} clientes...</p>
                </div>
              )}

              {/* ── ESTADO: Concluído ── */}
              {importStatus === 'done' && importResult && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <p className="text-lg font-bold text-emerald-800">Importação concluída!</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-gray-700">{importResult.total}</p>
                      <p className="text-xs text-gray-500">Total no arquivo</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-emerald-700">{importResult.inseridos}</p>
                      <p className="text-xs text-emerald-600">Cadastrados</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-amber-700">{importResult.duplicados}</p>
                      <p className="text-xs text-amber-600">CPF duplicado</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-red-700">{importResult.invalidos}</p>
                      <p className="text-xs text-red-600">Inválidos</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0">
              {importStatus === 'preview' && (
                <>
                  <button
                    onClick={() => {
                      setImportStatus('idle')
                      setImportData([])
                      setImportErro(null)
                    }}
                    className="border rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Trocar arquivo
                  </button>
                  <button
                    onClick={importarClientes}
                    disabled={validosCount === 0}
                    className="bg-emerald-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Importar {validosCount} cliente{validosCount !== 1 ? 's' : ''}
                  </button>
                </>
              )}

              {importStatus === 'done' && (
                <button
                  onClick={fecharImportModal}
                  className="bg-blue-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-blue-700"
                >
                  Fechar
                </button>
              )}

              {importStatus === 'idle' && (
                <button
                  onClick={fecharImportModal}
                  className="border rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}