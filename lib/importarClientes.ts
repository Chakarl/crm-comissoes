import * as XLSX from 'xlsx'
import { formatarNomeProprio } from '@/lib/formatarNome'

export interface ClienteImportado {
  nome: string
  cpf: string
  telefone: string | null
  agencia: string | null
  conta: string | null
  data_cadastro: string | null
  valido: boolean
  erro: string | null
}

// ── Validação real de CPF ──
function validarCPF(cpf: string): boolean {
  const nums = cpf.replace(/\D/g, '')
  if (nums.length !== 11) return false
  if (/^(\d)\1{10}$/.test(nums)) return false // 111.111.111-11, etc.

  let soma = 0
  for (let i = 0; i < 9; i++) soma += parseInt(nums[i]) * (10 - i)
  let resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== parseInt(nums[9])) return false

  soma = 0
  for (let i = 0; i < 10; i++) soma += parseInt(nums[i]) * (11 - i)
  resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== parseInt(nums[10])) return false

  return true
}

function maskCPF(v: string): string {
  return v
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function normalizarData(valor: any): string | null {
  if (!valor) return null

  // Se for número (serial date do Excel)
  if (typeof valor === 'number') {
    const data = XLSX.SSF.parse_date_code(valor)
    if (data) {
      const y = data.y
      const m = String(data.m).padStart(2, '0')
      const d = String(data.d).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    return null
  }

  const str = String(valor).trim()

  // dd/mm/yyyy
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`
  }

  // yyyy-mm-dd
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

  return null
}

// ── Mapeia headers flexíveis ──
function encontrarColuna(headers: string[], opcoes: string[]): number {
  const headersNorm = headers.map((h) => (h || '').toString().toLowerCase().trim())
  for (const op of opcoes) {
    const idx = headersNorm.findIndex((h) => h.includes(op))
    if (idx !== -1) return idx
  }
  return -1
}

function extrairValor(row: any[], idx: number): string {
  if (idx === -1 || !row[idx]) return ''
  return String(row[idx]).trim()
}

// ── Parse XML ──
function parseXML(text: string): any[][] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/xml')

  // Tenta <Row> ou <row> ou <registro>
  const tagNames = ['Row', 'row', 'registro', 'cliente', 'Cliente', 'record']
  let rows: Element[] = []

  for (const tag of tagNames) {
    rows = Array.from(doc.getElementsByTagName(tag))
    if (rows.length > 0) break
  }

  if (rows.length === 0) return []

  // Pega headers do primeiro registro
  const firstRow = rows[0]
  const headers = Array.from(firstRow.children).map((el) => el.tagName)

  const data: any[][] = [headers]
  rows.forEach((row) => {
    const vals = Array.from(row.children).map((el) => el.textContent || '')
    data.push(vals)
  })

  return data
}

// ── Função principal ──
export async function parsarArquivoClientes(file: File): Promise<ClienteImportado[]> {
  let rawData: any[][]

  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'xml') {
    const text = await file.text()
    rawData = parseXML(text)
  } else {
    // Excel ou CSV
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true })
  }

  if (rawData.length < 2) return []

  const headers = rawData[0].map((h: any) => String(h || ''))

  // Mapeia colunas
  const colNome = encontrarColuna(headers, ['nome', 'name', 'cliente'])
  const colCPF = encontrarColuna(headers, ['cpf', 'cpf/cnpj', 'documento'])
  const colTelefone = encontrarColuna(headers, ['telefone', 'tel', 'celular', 'fone', 'phone'])
  const colAgencia = encontrarColuna(headers, ['agencia', 'agência', 'ag'])
  const colConta = encontrarColuna(headers, ['conta', 'account', 'cc'])
  const colData = encontrarColuna(headers, ['data', 'date', 'data_cadastro', 'data cadastro'])

  if (colNome === -1 || colCPF === -1) {
    return [{
      nome: '',
      cpf: '',
      telefone: null,
      agencia: null,
      conta: null,
      data_cadastro: null,
      valido: false,
      erro: 'Planilha precisa ter ao menos colunas "Nome" e "CPF".',
    }]
  }

  const cpfsVistos = new Set<string>()
  const resultado: ClienteImportado[] = []

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i]
    if (!row || row.length === 0) continue

    const nomeRaw = extrairValor(row, colNome)
    const cpfRaw = extrairValor(row, colCPF).replace(/\D/g, '')

    if (!nomeRaw && !cpfRaw) continue // linha vazia

    const nome = formatarNomeProprio(nomeRaw)
    const telefone = extrairValor(row, colTelefone).replace(/\D/g, '') || null
    const agencia = extrairValor(row, colAgencia) || null
    const conta = extrairValor(row, colConta) || null
    const data_cadastro = normalizarData(colData !== -1 ? row[colData] : null)

    let valido = true
    let erro: string | null = null

    if (!nomeRaw) {
      valido = false
      erro = 'Nome vazio'
    } else if (cpfRaw.length !== 11) {
      valido = false
      erro = `CPF inválido (${cpfRaw.length} dígitos)`
    } else if (!validarCPF(cpfRaw)) {
      valido = false
      erro = 'CPF inválido (dígito verificador)'
    } else if (cpfsVistos.has(cpfRaw)) {
      valido = false
      erro = 'CPF duplicado na planilha'
    }

    if (valido) cpfsVistos.add(cpfRaw)

    resultado.push({
      nome,
      cpf: cpfRaw.length === 11 ? maskCPF(cpfRaw) : cpfRaw,
      telefone,
      agencia,
      conta,
      data_cadastro,
      valido,
      erro,
    })
  }

  return resultado
}