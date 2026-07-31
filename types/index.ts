export interface TipoContrato {
  id: number
  slug: string
  nome: string
  distribuicao: 'integral' | 'parcelado_5m' | 'parcelado_10m'
  created_at: string
}

export interface FaixaComissao {
  id: number
  tipo_contrato_slug: string
  taxa_min: number
  taxa_max: number
  prazo_min: number
  prazo_max: number
  tiquete_min: number
  perc_comissao: number
  valor_fixo: number | null
}

export interface Proposta {
  id: number
  user_id: string
  num_proposta: string
  data_proposta: string
  tipo_contrato_slug: string
  nome_cliente: string
  cpf_cliente: string | null
  telefone_cliente: string | null
  valor_contratado: number
  taxa_juros: number | null
  prazo_meses: number | null
  perc_comissao: number | null
  valor_comissao: number
  status: 'ativo' | 'cancelado' | 'pago'
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface ComissaoParcela {
  id: number
  proposta_id: number
  mes_referencia: string
  valor_parcela: number
  status: 'pendente' | 'pago' | 'cancelado'
}