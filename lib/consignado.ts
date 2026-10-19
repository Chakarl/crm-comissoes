function normalizar(valor: string | null | undefined): string {
  return (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function isTipoPropostaConsignado(tipo: {
  codigo?: string | null
  nome?: string | null
  categoria?: string | null
} | null | undefined): boolean {
  const codigo = normalizar(tipo?.codigo)
  const nome = normalizar(tipo?.nome)
  const categoria = normalizar(tipo?.categoria)
  const produtoTrabalhador = codigo.includes('trabalhador') || nome.includes('trabalhador') || categoria.includes('trabalhador')
  return produtoTrabalhador || codigo.includes('consignado') || nome.includes('consignado') || categoria.includes('consignado')
}