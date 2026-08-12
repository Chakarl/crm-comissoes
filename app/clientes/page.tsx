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

const CONVENIOS = [
  'BB Dental',
  'Capitalização',
  'Consignado',
  'Consórcio',
  'Conta',
  'INSS',
  'Não Consignado',
  'Portabilidade',
  'Seguro',
]

interface Cliente {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  agencia: string | null
  conta: string | null
  convenio: string | null
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
  convenio: '',
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

// ── Formatar telefone para exibição (00) 00000-0000 ──
function formatarTelefoneExibicao(tel: string | null): string {
  if (!tel) return '—'
  const digitos = tel.replace(/\D/g, '')
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  }
  return tel
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
      convenio: c.convenio || '',
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
            convenio: formData.convenio || null,
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
              convenio: formData.convenio || null,
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

  // ── Filtros ──

  const nomePromotorMap: Record<string, string> = {}
  listaPromotores.forEach((p) => {
    nomePromotorMap[p.id] = p.nome
  })

  const filtrados = clientes.filter((c) => {
    const termo = search.toLowerCase()
    const matchBusca =
      !termo ||
      c.nome.toLowerCase().includes(termo) ||
      (c.cpf && c.cpf.includes(termo)) ||
      (c.telefone && c.telefone.includes(termo))

    let matchMes = true
    if (mesFiltro) {
      matchMes = c.data_cadastro?.startsWith(mesFiltro) || false
    }

    let matchIntervalo = true
    if (dataInicio) {
      matchIntervalo = (c.data_cadastro || '') >= dataInicio
    }
    if (dataFim) {
      matchIntervalo = matchIntervalo && (c.data_cadastro || '') <= dataFim
    }

    return matchBusca && matchMes && matchIntervalo
  })

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA)
  const paginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UsersIcon className="w-6 h-6" /> Clientes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={abrirImport}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm"
          >
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" /> Novo Cliente
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>

        {usuario?.is_master && (
          <select
            value={promotorFiltro}
            onChange={(e) => setPromotorFiltro(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="todos">Todos os promotores</option>
            {listaPromotores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        )}

        <FiltroMes value={mesFiltro} onChange={setMesFiltro} />
      </div>

      {/* Filtro por intervalo de datas */}
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Data início</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Data fim</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        {(dataInicio || dataFim) && (
          <button
            onClick={() => {
              setDataInicio('')
              setDataFim('')
            }}
            className="text-xs text-red-500 hover:underline pb-2"
          >
            Limpar datas
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">CPF</th>
              <th className="px-4 py-3 text-left">Telefone</th>
              <th className="px-4 py-3 text-left">Agência</th>
              <th className="px-4 py-3 text-left">Conta</th>
              <th className="px-4 py-3 text-left">Convênio</th>
              <th className="px-4 py-3 text-left">Cadastro</th>
              <th className="px-4 py-3 text-left">Última Proposta</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500" />
                </td>
              </tr>
            ) : paginados.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-10 text-gray-400">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : (
              paginados.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{c.cpf || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatarTelefoneExibicao(c.telefone)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.agencia || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.conta || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.convenio || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.data_cadastro
                      ? new Date(c.data_cadastro + 'T00:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.ultimaProposta
                      ? new Date(c.ultimaProposta + 'T00:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => abrirEditar(c)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Excluir este cliente?')) handleDelete(c.id)
                        }}
                        disabled={deletando === c.id}
                        className="text-red-500 hover:text-red-700"
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <Paginacao pagina={pagina} totalPaginas={totalPaginas} onChange={setPagina} />
      )}

      {/* ══ MODAL CADASTRO / EDIÇÃO ══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">
                {editando ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={fecharModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium mb-1">Nome *</label>
                <input
                  required
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Nome completo"
                />
              </div>

              {/* CPF */}
              <div>
                <label className="block text-sm font-medium mb-1">CPF *</label>
                <input
                  required
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="000.000.000-00"
                />
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone: maskTelefone(e.target.value) })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="(00) 00000-0000"
                />
              </div>

              {/* Agência + Conta */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Agência</label>
                  <input
                    type="text"
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Conta</label>
                  <input
                    type="text"
                    value={formData.conta}
                    onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="00000-0"
                  />
                </div>
              </div>

              {/* Convênio */}
              <div>
                <label className="block text-sm font-medium mb-1">Convênio</label>
                <select
                  value={formData.convenio}
                  onChange={(e) => setFormData({ ...formData, convenio: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Selecione o convênio</option>
                  {CONVENIOS.map((conv) => (
                    <option key={conv} value={conv}>
                      {conv}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data de Cadastro */}
              <div>
                <label className="block text-sm font-medium mb-1">Data de Cadastro</label>
                <input
                  type="date"
                  value={formData.data_cadastro}
                  onChange={(e) => setFormData({ ...formData, data_cadastro: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {erroForm && (
                <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{erroForm}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editando ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL IMPORTAÇÃO ══ */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" /> Importar Clientes
              </h2>
              <button onClick={fecharImport} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* STEP: Upload */}
              {importStep === 'upload' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Envie uma planilha <strong>.xlsx, .xls, .csv ou .xml</strong> com as
                    colunas: <code>nome</code>, <code>cpf</code>, <code>telefone</code>,{' '}
                    <code>agencia</code>, <code>conta</code>.
                  </p>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(true)
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition
                      ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
                  >
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600">
                      Arraste o arquivo aqui ou <span className="text-blue-600 font-medium">clique para selecionar</span>
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,.xml"
                      onChange={onFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* STEP: Preview */}
              {importStep === 'preview' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    <strong>{importDados.filter((d) => d.valido).length}</strong> registros
                    válidos de <strong>{importDados.length}</strong> encontrados.
                  </p>

                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Nome</th>
                          <th className="px-3 py-2 text-left">CPF</th>
                          <th className="px-3 py-2 text-left">Telefone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {importDados.map((d, i) => (
                          <tr key={i} className={d.valido ? '' : 'bg-red-50'}>
                            <td className="px-3 py-2">
                              {d.valido ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                            </td>
                            <td className="px-3 py-2">{d.nome || '—'}</td>
                            <td className="px-3 py-2">{d.cpf || '—'}</td>
                            <td className="px-3 py-2">{d.telefone || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setImportStep('upload')}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleImportar}
                      disabled={importando || importDados.filter((d) => d.valido).length === 0}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 text-sm disabled:opacity-50"
                    >
                      {importando && <Loader2 className="w-4 h-4 animate-spin" />}
                      Importar {importDados.filter((d) => d.valido).length} clientes
                    </button>
                  </div>
                </div>
              )}

              {/* STEP: Resultado */}
              {importStep === 'resultado' && importResultado && (
                <div className="space-y-4 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                  <h3 className="text-lg font-semibold">Importação concluída!</h3>

                  <div className="flex justify-center gap-6 text-sm">
                    <div className="text-green-600">
                      <strong>{importResultado.inseridos}</strong> inseridos
                    </div>
                    <div className="text-yellow-600">
                      <strong>{importResultado.duplicados}</strong> duplicados
                    </div>
                    <div className="text-red-600">
                      <strong>{importResultado.erros}</strong> erros
                    </div>
                  </div>

                  <button
                    onClick={fecharImport}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm"
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