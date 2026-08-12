'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useUsuario } from '@/hooks/useUsuario'
import { formatarNomeProprio } from '@/lib/formatarNome'
import { parsarArquivoClientes, ClienteImportado } from '@/lib/importarClientes'

const POR_PAGINA = 10

export const CONVENIOS = [
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

export interface Cliente {
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

export interface ClienteComData extends Cliente {
  ultimaProposta: string | null
}

export const emptyForm = {
  nome: '',
  cpf: '',
  telefone: '',
  agencia: '',
  conta: '',
  convenio: '',
  data_cadastro: new Date().toISOString().split('T')[0],
}

export type FormData = typeof emptyForm

export function maskCPF(v: string) {
  return v
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function maskTelefone(v: string) {
  return v
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

export function formatarTelefoneExibicao(tel: string | null): string {
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

export { POR_PAGINA }

export function useClientes() {
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
  const [listaPromotores, setListaPromotores] = useState<{ id: string; nome: string }[]>([])
  const [convenioFiltro, setConvenioFiltro] = useState<string>('todos')
  const [dataInicio, setDataInicio] = useState<string>('')
  const [dataFim, setDataFim] = useState<string>('')

  // ── Importação ──
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario])

  useEffect(() => {
    if (usuario) loadClientes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotorFiltro])

  useEffect(() => {
    setPagina(1)
  }, [search, mesFiltro, dataInicio, dataFim, convenioFiltro])

  const carregarPromotores = async () => {
    const { data: usuarios } = await supabase.rpc('listar_todos_usuarios')
    if (usuarios) {
      const promotores = usuarios
        .filter((u: any) => !u.is_master)
        .map((u: any) => ({ id: u.id, nome: u.nome || 'Sem nome' }))
      setListaPromotores(promotores)
    }
  }

  const loadClientes = async () => {
    if (!usuario) return
    setLoading(true)

    let queryClientes = supabase.from('clientes').select('*').order('nome', { ascending: true })

    if (!usuario.is_master) {
      queryClientes = queryClientes.eq('usuario_id', usuario.id)
    } else if (promotorFiltro !== 'todos') {
      queryClientes = queryClientes.eq('usuario_id', promotorFiltro)
    }

    let queryPropostas = supabase.from('propostas').select('nome_cliente, data_proposta')

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

  // ── Mapa de nomes de promotores ──
  const nomePromotorMap: Record<string, string> = useMemo(() => {
    const m: Record<string, string> = {}
    listaPromotores.forEach((p) => {
      m[p.id] = p.nome
    })
    return m
  }, [listaPromotores])

  // ── Datas disponíveis (para FiltroMes) ──
  const datasDisponiveis = useMemo(() => {
    const set = new Set<string>()
    clientes.forEach((c) => {
      if (c.data_cadastro) {
        const mes = c.data_cadastro.slice(0, 7) // "YYYY-MM"
        set.add(mes)
      }
    })
    return Array.from(set).sort().reverse()
  }, [clientes])

  // ── Filtragem ──
  const filtered = useMemo(() => {
  let list = [...clientes]

  if (search.trim()) {
    const s = search.trim().toLowerCase()
    list = list.filter((c) => {
      const nome = (c.nome || '').toLowerCase()
      const cpf = (c.cpf || '').replace(/\D/g, '')
      const termo = s.replace(/\D/g, '')
      return nome.includes(s) || (termo && cpf.includes(termo))
    })
  }

  if (mesFiltro) {
    list = list.filter((c) => c.data_cadastro && c.data_cadastro.startsWith(mesFiltro))
  }

  if (convenioFiltro !== 'todos') {
    list = list.filter((c) => c.convenio === convenioFiltro)
  }

  if (dataInicio) {
    list = list.filter((c) => c.data_cadastro && c.data_cadastro >= dataInicio)
  }

  if (dataFim) {
    list = list.filter((c) => c.data_cadastro && c.data_cadastro <= dataFim)
  }

  return list
}, [clientes, search, mesFiltro, convenioFiltro, dataInicio, dataFim])

  // ── Paginação ──
  const totalPaginas = Math.max(1, Math.ceil(filtered.length / POR_PAGINA))
  const pag = Math.min(pagina, totalPaginas)
  const fatia = filtered.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA)

  // ── CRUD ──
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

        const { error } = await supabase.from('clientes').insert([
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

  // ══ IMPORTAÇÃO ══

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

  // ── Contadores de importação para o modal ──
  const validosCount = importDados.filter((d) => d.valido).length
  const invalidosCountPreview = importDados.filter((d) => !d.valido).length

  return {
    usuario,
    loadingUser,
    loading,
    clientes,
    filtered,
    fatia,
    pag,
    totalPaginas,
    search,
    setSearch,
    pagina,
    setPagina,
    mesFiltro,
    setMesFiltro,
    datasDisponiveis,
    convenioFiltro,
    setConvenioFiltro,
    dataInicio,
    setDataInicio,
    dataFim,
    setDataFim,
    promotorFiltro,
    setPromotorFiltro,
    listaPromotores,
    nomePromotorMap,
    showModal,
    editando,
    formData,
    setFormData,
    saving,
    erroForm,
    deletando,
    abrirNovo,
    abrirEditar,
    fecharModal,
    handleSubmit,
    handleDelete,
    // Importação
    showImportModal,
    importStep,
    importDados,
    importando,
    importResultado,
    dragOver,
    setDragOver,
    fileInputRef,
    validosCount,
    invalidosCountPreview,
    abrirImport,
    fecharImport,
    onFileChange,
    onDrop,
    handleImportar,
  }
}