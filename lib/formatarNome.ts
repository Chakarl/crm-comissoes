export function formatarNomeProprio(nome: string): string {
  const preposicoes = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])
  return nome
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((p, i) =>
      i > 0 && preposicoes.has(p.toLowerCase())
        ? p.toLowerCase()
        : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
    )
    .join(' ')
}