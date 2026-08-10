// src/lib/importarClientes.ts

import * as XLSX from 'xlsx'

// ── Interfaces ──
export interface ClienteImportado {
  nome: string
  cpf: string
  telefone: string | null
  agencia: string | null
  conta: string | null
  data_cadastro: string | null
  valido: boolean
  erro?: string
}

// ── Validação de CPF ──
function validarCPF(cpf: string): boolean {
  const nums = cpf.replace(/\D/g, '')
  if (nums.length !== 11) return false
  if (/^(\d)\1{10}$/.test(nums)) return false

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

// ── Máscara de CPF ──
function maskCPF(v: string): string {
  return v
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

// ── Normalizar data ──
function normalizarData(valor: any): string | null {
  if (valor == null || valor === '') return null

  if (typeof valor === 'number') {
    const dataBase = new Date(1899, 11, 30)
    const data = new Date(dataBase.getTime() + valor * 86400000)
    if (!isNaN(data.getTime())) {
      return data.toISOString().split('T')[0]
    }
    return null
  }

  const str = String(valor).trim()

  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (brMatch) {
    const [, d, m, y] = brMatch
    const data = new Date(Number(y), Number(m) - 1, Number(d))
    if (!isNaN(data.getTime())) {
      return data.toISOString().split('T')[0]
    }
  }

  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const data = new Date(str)
    if (!isNaN(data.getTime())) {
      return data.toISOString().split('T')[0]
    }
  }

  return null
}

// ── Encontrar coluna pelo header (MATCH EXATO PRIMEIRO) ──
function encontrarColuna(headers: string[], possibilidades: string[]): number {
  // 1ª passada: match EXATO
  const idxExato = headers.findIndex((h) => {
    const header = h.toLowerCase().trim()
    return possibilidades.some((p) => header === p)
  })
  if (idxExato >= 0) return idxExato

  // 2ª passada: match por prefixo (fallback)
  const idxPrefixo = headers.findIndex((h) => {
    const header = h.toLowerCase().trim()
    return possibilidades.some(
      (p) => header.startsWith(p + ':') || header.startsWith(p + ' ')
    )
  })
  return idxPrefixo
}

// ── Extrair valor de célula ──
function extrairValor(row: any[], index: number): string {
  if (index < 0 || index >= row.length) return ''
  const val = row[index]
  if (val == null) return ''
  return String(val).trim()
}

// ── Parser XML ──
function parseXML(xmlString: string): any[][] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  const rows = doc.querySelectorAll('Row')
  const result: any[][] = []

  rows.forEach((row) => {
    const cells: any[] = []
    row.querySelectorAll('Cell Data, Cell ss\\:Data').forEach((cell) => {
      cells.push(cell.textContent || '')
    })
    if (cells.length > 0) result.push(cells)
  })

  return result
}

// ── Função principal ──
export async function parsarArquivoClientes(
  file: File
): Promise<ClienteImportado[]> {
  let rawData: any[][]

  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'xml') {
    const text = await file.text()
    rawData = parseXML(text)
  } else {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: false,
      raw: true,
      cellText: false,
    })

    rawData = []
    let headerGlobal: any[] | null = null

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
      })

      if (sheetData.length === 0) continue

      if (!headerGlobal) {
        headerGlobal = sheetData[0]
        rawData = [...sheetData]
      } else {
        const primeiraLinha = sheetData[0]
        const pareceHeader = primeiraLinha.every(
          (cell: any) =>
            typeof cell === 'string' &&
            isNaN(Number(cell.replace(/\D/g, '').slice(0, 1)))
        )

        if (pareceHeader) {
          rawData.push(...sheetData.slice(1))
        } else {
          rawData.push(...sheetData)
        }
      }
    }
  }

  if (rawData.length < 2) return []

  // ── Mapear headers ──
  const headers = rawData[0].map((h: any) => String(h || '').toLowerCase().trim())

  const colData = encontrarColuna(headers, [
    'data',
    'date',
    'data_cadastro',
    'data cadastro',
  ])
  const colNome = encontrarColuna(headers, ['nome', 'name', 'cliente'])
  const colCPF = encontrarColuna(headers, ['cpf', 'cpf/cnpj', 'documento'])
  const colAgencia = encontrarColuna(headers, ['agencia', 'agência', 'ag'])
  const colConta = encontrarColuna(headers, ['conta', 'account', 'cc'])
  const colTel = encontrarColuna(headers, [
    'telefone',
    'tel',
    'celular',
    'fone',
    'phone',
  ])

  // ★ DEBUG — remova depois de confirmar que está correto
  console.log('[IMPORT] Headers encontrados:', headers)
  console.log('[IMPORT] Índices mapeados:', {
    data: colData,
    nome: colNome,
    cpf: colCPF,
    agencia: colAgencia,
    conta: colConta,
    telefone: colTel,
  })

  if (colNome < 0 || colCPF < 0) {
    return [
      {
        nome: '',
        cpf: '',
        telefone: null,
        agencia: null,
        conta: null,
        data_cadastro: null,
        valido: false,
        erro: 'Colunas obrigatórias não encontradas. Precisa de: Nome, CPF.',
      },
    ]
  }

  // ── Processar linhas ──
  const resultado: ClienteImportado[] = []
  const cpfsVistos = new Set<string>()

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i]
    if (!row || row.length === 0) continue

    const nome = extrairValor(row, colNome)

    // ★ padStart garante 11 dígitos (Excel come zero à esquerda)
    const cpfRaw = extrairValor(row, colCPF).replace(/\D/g, '').padStart(11, '0')

    const telefone =
      colTel >= 0
        ? extrairValor(row, colTel).replace(/\D/g, '') || null
        : null
    const agencia =
      colAgencia >= 0 ? extrairValor(row, colAgencia) || null : null
    const conta =
      colConta >= 0 ? extrairValor(row, colConta) || null : null

    let dataCadastro: string | null = null
    if (colData >= 0) {
      dataCadastro = normalizarData(row[colData])
    }

    // Linha vazia
    if (!nome) continue

    // CPF tamanho
    if (!cpfRaw || cpfRaw.length !== 11) {
      resultado.push({
        nome,
        cpf: cpfRaw,
        telefone,
        agencia,
        conta,
        data_cadastro: dataCadastro,
        valido: false,
        erro: 'CPF inválido (precisa ter 11 dígitos)',
      })
      continue
    }

    // CPF dígitos verificadores
    if (!validarCPF(cpfRaw)) {
      resultado.push({
        nome,
        cpf: maskCPF(cpfRaw),
        telefone,
        agencia,
        conta,
        data_cadastro: dataCadastro,
        valido: false,
        erro: 'CPF inválido (dígitos verificadores não conferem)',
      })
      continue
    }

    // Data obrigatória
    if (!dataCadastro) {
      resultado.push({
        nome,
        cpf: maskCPF(cpfRaw),
        telefone,
        agencia,
        conta,
        data_cadastro: null,
        valido: false,
        erro: 'Data obrigatória (coluna "Data" vazia ou formato não reconhecido)',
      })
      continue
    }

    // Duplicata interna
    if (cpfsVistos.has(cpfRaw)) {
      resultado.push({
        nome,
        cpf: maskCPF(cpfRaw),
        telefone,
        agencia,
        conta,
        data_cadastro: dataCadastro,
        valido: false,
        erro: 'CPF duplicado na planilha',
      })
      continue
    }

    cpfsVistos.add(cpfRaw)

    // ★ VÁLIDO
    resultado.push({
      nome,
      cpf: maskCPF(cpfRaw),
      telefone,
      agencia,
      conta,
      data_cadastro: dataCadastro,
      valido: true,
    })
  }

  return resultado
}