// Tabela de comissões

interface TabelaComissao {
  taxaMin: number
  taxaMax: number
  prazoMin: number
  prazoMax: number
  comissao: number
}

const consignadoPublico: TabelaComissao[] = [
  { taxaMin: 1.75, taxaMax: 1.77, prazoMin: 36, prazoMax: 120, comissao: 0.55 },
  { taxaMin: 1.78, taxaMax: 1.87, prazoMin: 36, prazoMax: 120, comissao: 1.64 },
  { taxaMin: 1.88, taxaMax: 1.97, prazoMin: 36, prazoMax: 120, comissao: 2.46 },
  { taxaMin: 1.98, taxaMax: 2.07, prazoMin: 36, prazoMax: 120, comissao: 3.00 },
  { taxaMin: 2.08, taxaMax: 2.17, prazoMin: 36, prazoMax: 120, comissao: 3.28 },
  { taxaMin: 2.18, taxaMax: 2.27, prazoMin: 36, prazoMax: 120, comissao: 4.00 },
  { taxaMin: 2.28, taxaMax: 2.37, prazoMin: 36, prazoMax: 120, comissao: 4.20 },
  { taxaMin: 2.38, taxaMax: 2.47, prazoMin: 36, prazoMax: 120, comissao: 4.20 },
  { taxaMin: 2.48, taxaMax: 99.99, prazoMin: 36, prazoMax: 120, comissao: 4.20 },
]

const consignadoPrivado: TabelaComissao[] = [
  { taxaMin: 2.54, taxaMax: 99.99, prazoMin: 18, prazoMax: 35, comissao: 0.21 },
  { taxaMin: 2.54, taxaMax: 2.99, prazoMin: 36, prazoMax: 48, comissao: 1.48 },
  { taxaMin: 2.54, taxaMax: 2.99, prazoMin: 49, prazoMax: 60, comissao: 1.53 },
  { taxaMin: 2.54, taxaMax: 2.99, prazoMin: 61, prazoMax: 96, comissao: 1.58 },
  { taxaMin: 3.00, taxaMax: 3.50, prazoMin: 36, prazoMax: 48, comissao: 1.96 },
  { taxaMin: 3.00, taxaMax: 3.50, prazoMin: 49, prazoMax: 60, comissao: 2.03 },
  { taxaMin: 3.00, taxaMax: 3.50, prazoMin: 61, prazoMax: 96, comissao: 2.10 },
  { taxaMin: 3.51, taxaMax: 99.99, prazoMin: 36, prazoMax: 48, comissao: 2.52 },
  { taxaMin: 3.51, taxaMax: 99.99, prazoMin: 49, prazoMax: 60, comissao: 2.58 },
  { taxaMin: 3.51, taxaMax: 99.99, prazoMin: 61, prazoMax: 96, comissao: 2.63 },
]

const consignadoMPDG: TabelaComissao[] = [
  { taxaMin: 1.64, taxaMax: 1.67, prazoMin: 48, prazoMax: 96, comissao: 0.63 },
  { taxaMin: 1.68, taxaMax: 1.79, prazoMin: 48, prazoMax: 96, comissao: 1.58 },
  { taxaMin: 1.80, taxaMax: 99.99, prazoMin: 48, prazoMax: 96, comissao: 2.16 },
]

const consignadoSPMG: TabelaComissao[] = [
  { taxaMin: 1.72, taxaMax: 1.79, prazoMin: 36, prazoMax: 120, comissao: 0.88 },
  { taxaMin: 1.80, taxaMax: 1.89, prazoMin: 36, prazoMax: 120, comissao: 1.73 },
  { taxaMin: 1.90, taxaMax: 1.99, prazoMin: 36, prazoMax: 120, comissao: 2.46 },
  { taxaMin: 2.00, taxaMax: 2.09, prazoMin: 36, prazoMax: 120, comissao: 3.00 },
  { taxaMin: 2.10, taxaMax: 2.19, prazoMin: 36, prazoMax: 120, comissao: 3.55 },
  { taxaMin: 2.20, taxaMax: 2.29, prazoMin: 36, prazoMax: 120, comissao: 4.00 },
  { taxaMin: 2.30, taxaMax: 2.39, prazoMin: 36, prazoMax: 120, comissao: 4.20 },
  { taxaMin: 2.40, taxaMax: 2.49, prazoMin: 36, prazoMax: 120, comissao: 4.20 },
  { taxaMin: 2.50, taxaMax: 99.99, prazoMin: 36, prazoMax: 120, comissao: 4.20 },
]

const inssNovo: TabelaComissao[] = [
  { taxaMin: 1.85, taxaMax: 1.85, prazoMin: 48, prazoMax: 60, comissao: 1.12 },
  { taxaMin: 1.85, taxaMax: 1.85, prazoMin: 61, prazoMax: 84, comissao: 1.34 },
  { taxaMin: 1.85, taxaMax: 1.85, prazoMin: 85, prazoMax: 999, comissao: 2.28 },
]

const inssRenovacao: TabelaComissao[] = [
  { taxaMin: 1.00, taxaMax: 99.99, prazoMin: 48, prazoMax: 60, comissao: 1.10 },
  { taxaMin: 1.00, taxaMax: 99.99, prazoMin: 61, prazoMax: 84, comissao: 1.30 },
  { taxaMin: 1.00, taxaMax: 99.99, prazoMin: 85, prazoMax: 999, comissao: 1.84 },
]

const naoConsignado: TabelaComissao[] = [
  { taxaMin: 2.92, taxaMax: 2.94, prazoMin: 13, prazoMax: 96, comissao: 0.00 },
  { taxaMin: 2.95, taxaMax: 3.37, prazoMin: 13, prazoMax: 96, comissao: 0.88 },
  { taxaMin: 3.38, taxaMax: 3.63, prazoMin: 13, prazoMax: 96, comissao: 0.88 },
  { taxaMin: 3.64, taxaMax: 4.03, prazoMin: 13, prazoMax: 96, comissao: 0.88 },
  { taxaMin: 4.04, taxaMax: 4.29, prazoMin: 13, prazoMax: 96, comissao: 2.59 },
  { taxaMin: 4.30, taxaMax: 4.75, prazoMin: 13, prazoMax: 96, comissao: 2.59 },
  { taxaMin: 4.76, taxaMax: 4.89, prazoMin: 13, prazoMax: 96, comissao: 2.59 },
  { taxaMin: 4.90, taxaMax: 5.38, prazoMin: 13, prazoMax: 96, comissao: 3.90 },
  { taxaMin: 5.39, taxaMax: 5.78, prazoMin: 13, prazoMax: 96, comissao: 3.90 },
  { taxaMin: 5.79, taxaMax: 99.99, prazoMin: 13, prazoMax: 96, comissao: 4.20 },
]

export function calcularComissao(
  tipoContrato: string,
  subtipo: string,
  valorContratado: number,
  taxaJuros?: number,
  prazo?: number
): { percentual: number; valor: number } {
  
  let tabela: TabelaComissao[] = []

  switch (tipoContrato.toLowerCase()) {
    case 'consignado':
      if (subtipo.toLowerCase().includes('publico') || subtipo.toLowerCase().includes('exercito')) {
        tabela = consignadoPublico
      } else if (subtipo.toLowerCase().includes('privado')) {
        tabela = consignadoPrivado
      } else if (subtipo.toLowerCase().includes('mpdg') || subtipo.toLowerCase().includes('siape')) {
        tabela = consignadoMPDG
      } else if (subtipo.toLowerCase().includes('sp') || subtipo.toLowerCase().includes('mg')) {
        tabela = consignadoSPMG
      }
      break
    case 'inss':
      if (subtipo.toLowerCase().includes('novo')) {
        tabela = inssNovo
      } else {
        tabela = inssRenovacao
      }
      break
    case 'nao_consignado':
      tabela = naoConsignado
      break
    case 'consorcio':
      const valorConsorcio = valorContratado * 0.025
      return { percentual: 2.5, valor: valorConsorcio }
    default:
      return { percentual: 0, valor: 0 }
  }

  let percentualEncontrado = 0

  for (const regra of tabela) {
    const taxaOk = !taxaJuros || (taxaJuros >= regra.taxaMin && taxaJuros <= regra.taxaMax)
    const prazoOk = !prazo || (prazo >= regra.prazoMin && prazo <= regra.prazoMax)
    
    if (taxaOk && prazoOk) {
      percentualEncontrado = regra.comissao
      break
    }
  }

  const valorComissao = valorContratado * (percentualEncontrado / 100)
  
  return {
    percentual: percentualEncontrado,
    valor: valorComissao
  }
}

export function calcularParcelasConsorcio(
  valorComissao: number,
  dataFechamento: Date
): { mes: Date; valor: number }[] {
  const valorParcela = valorComissao / 5
  const parcelas: { mes: Date; valor: number }[] = []
  
  const dia = dataFechamento.getDate()
  let mesInicial = new Date(dataFechamento)
  
  if (dia > 25) {
    mesInicial.setMonth(mesInicial.getMonth() + 1)
  }
  
  for (let i = 0; i < 5; i++) {
    const mesParcela = new Date(mesInicial)
    mesParcela.setMonth(mesInicial.getMonth() + i)
    mesParcela.setDate(1)
    
    parcelas.push({
      mes: mesParcela,
      valor: valorParcela
    })
  }
  
  return parcelas
}