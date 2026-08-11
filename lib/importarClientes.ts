import * as XLSX from 'xlsx'

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

function maskCPF(v: string): string {
  return v
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatarNome(nome: string): string {
  const preposicoes = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])
  return nome
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((p, i) =>
      i > 0 && preposicoes.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)
    )
    .join(' ')
}

function normalizarData(valor: any): string | null {
  if (valor == null || valor === '') return null
  if (typeof valor === 'number') {
    const dataBase = new Date(1899, 11, 30)
    const data = new Date(dataBase.getTime() + valor * 86400000)
    if (!isNaN(data.getTime())) return data.toISOString().split('T')[0]
    return null
  }
  const str = String(valor).trim()
  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (brMatch) {
    const [, d, m, y] = brMatch
    const data = new Date(Number(y), Number(m) - 1, Number(d))
    if (!isNaN(data.getTime())) return data.toISOString().split('T')[0]
  }
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const data = new Date(str)
    if (!isNaN(data.getTime())) return data.toISOString().split('T')[0]
  }
  return null
}

function encontrarColuna(headers: string[], possibilidades: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    if (possibilidades.includes(headers[i])) return i
  }
  for (let i = 0; i < headers.length; i++) {
    if (possibilidades.some((p) => headers[i].startsWith(p))) return i
  }
  return -1
}

function extrairValor(row: any[], index: number): string {
  if (index < 0 || index >= row.length) return ''
  const val = row[index]
  if (val == null) return ''
  return String(val).trim()
}

// ★★★ DETECÇÃO INTELIGENTE POR CONTEÚDO ★★★
function parecetelefone(valor: string): boolean {
  if (!valor) return false
  const nums = valor.replace(/\D/g, '')
  // Telefone: 10 ou 11 dígitos, ou formato (XX) XXXXX-XXXX
  if (nums.length === 10 || nums.length === 11) return true
  if (/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(valor.trim())) return true
  return false
}

function pareceAgencia(valor: string): boolean {
  if (!valor) return false
  // Agência: 4-5 dígitos, opcionalmente com -X no final
  return /^\d{4,5}(-\d)?$/.test(valor.replace(/\s/g, ''))
}

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

  const headers = rawData[0].map((h: any) =>
    String(h || '')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  )

  console.log('[IMPORT] Headers:', headers)

  const colData = encontrarColuna(headers, ['data', 'date', 'data_cadastro', 'data cadastro'])
  const colNome = encontrarColuna(headers, ['nome', 'name', 'cliente'])
  const colCPF = encontrarColuna(headers, ['cpf', 'cpf/cnpj', 'documento'])
  const colAgencia = encontrarColuna(headers, ['agencia', 'ag'])
  const colConta = encontrarColuna(headers, ['conta', 'account', 'cc'])
  const colTel = encontrarColuna(headers, ['telefone', 'celular', 'fone', 'phone', 'tel'])

  console.log('[IMPORT] Índices:', { colData, colNome, colCPF, colAgencia, colConta, colTel })

  if (colNome < 0 || colCPF < 0) {
    return [{
      nome: '', cpf: '', telefone: null, agencia: null, conta: null,
      data_cadastro: null, valido: false,
      erro: 'Colunas obrigatórias não encontradas. Precisa de: Nome, CPF.',
    }]
  }

  const resultado: ClienteImportado[] = []
  const cpfsVistos = new Set<string>()

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i]
    if (!row || row.length === 0) continue

    const nomeRaw = extrairValor(row, colNome)
    if (!nomeRaw) continue
    const nome = formatarNome(nomeRaw)

    const cpfRaw = extrairValor(row, colCPF).replace(/\D/g, '').padStart(11, '0')

    // ★ Pega valores brutos das 3 colunas
    const rawAgencia = colAgencia >= 0 ? extrairValor(row, colAgencia) : ''
    const rawConta = colConta >= 0 ? extrairValor(row, colConta) : ''
    const rawTel = colTel >= 0 ? extrairValor(row, colTel) : ''

    // ★ CORREÇÃO INTELIGENTE: reclassifica com base no conteúdo real
    let agencia: string | null = null
    let conta: string | null = null
    let telefone: string | null = null

    // Junta tudo num pool pra redistribuir corretamente
    const pool = [
      { valor: rawAgencia, origem: 'agencia' },
      { valor: rawConta, origem: 'conta' },
      { valor: rawTel, origem: 'telefone' },
    ].filter((p) => p.valor !== '')

    // Primeiro: encontra o telefone (10-11 dígitos)
    const telItem = pool.find((p) => parecetelefone(p.valor))
    if (telItem) {
      telefone = telItem.valor.replace(/\D/g, '')
      pool.splice(pool.indexOf(telItem), 1)
    }

    // Segundo: encontra a agência (4-5 dígitos com ou sem -X)
    const agItem = pool.find((p) => pareceAgencia(p.valor))
    if (agItem) {
      agencia = agItem.valor
      pool.splice(pool.indexOf(agItem), 1)
    }

    // Terceiro: o que sobrou é conta
    if (pool.length > 0) {
      // Se sobrou mais de 1, pega o que NÃO é telefone nem agência
      const contaItem = pool.find((p) => !parecetelefone(p.valor) && !pareceAgencia(p.valor))
      conta = contaItem ? contaItem.valor : pool[0].valor
    }

    // Se não achou telefone no pool mas rawTel tinha algo
    if (!telefone && rawTel) {
      telefone = rawTel.replace(/\D/g, '') || null
    }

    let dataCadastro: string | null = null
    if (colData >= 0) dataCadastro = normalizarData(row[colData])

    if (!cpfRaw || cpfRaw.length !== 11) {
      resultado.push({
        nome, cpf: cpfRaw, telefone, agencia, conta,
        data_cadastro: dataCadastro, valido: false,
        erro: 'CPF inválido (precisa ter 11 dígitos)',
      })
      continue
    }

    if (!validarCPF(cpfRaw)) {
      resultado.push({
        nome, cpf: maskCPF(cpfRaw), telefone, agencia, conta,
        data_cadastro: dataCadastro, valido: false,
        erro: 'CPF inválido (dígito verificador incorreto)',
      })
      continue
    }

    const cpfFormatado = maskCPF(cpfRaw)

    if (cpfsVistos.has(cpfRaw)) {
      resultado.push({
        nome, cpf: cpfFormatado, telefone, agencia, conta,
        data_cadastro: dataCadastro, valido: false,
        erro: 'CPF duplicado na planilha',
      })
      continue
    }

    cpfsVistos.add(cpfRaw)

    resultado.push({
      nome,
      cpf: cpfFormatado,
      telefone,
      agencia,
      conta,
      data_cadastro: dataCadastro,
      valido: true,
    })
  }

  return resultado
}