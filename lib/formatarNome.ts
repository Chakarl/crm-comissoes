const PREPOSICOES = new Set([
  "de", "da", "do", "das", "dos",
  "e", "em", "na", "no", "nas", "nos",
  "com", "por", "para", "ao", "aos",
])

export function formatarNomeProprio(nome: string): string {
  if (!nome) return ""

  return nome
    .trim()
    .replace(/\s+/g, " ")          // remove espaços duplos
    .toLowerCase()
    .split(" ")
    .map((palavra, index) => {
      // Primeira palavra sempre capitalizada
      if (index === 0) {
        return palavra.charAt(0).toUpperCase() + palavra.slice(1)
      }
      // Preposições ficam minúsculas
      if (PREPOSICOES.has(palavra)) {
        return palavra
      }
      // Demais palavras: primeira letra maiúscula
      return palavra.charAt(0).toUpperCase() + palavra.slice(1)
    })
    .join(" ")
}