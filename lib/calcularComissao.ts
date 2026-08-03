import { supabase } from "./supabase";

interface CalcInput {
  tipo_proposta_codigo: string;
  valor_contratado: number;
  taxa_juros?: number | null;
  prazo?: number | null;
}

interface CalcResult {
  comissao_pct: number | null;
  comissao_fixa: number | null;
  comissao_total: number;
  is_consorcio: boolean;
}

export async function calcularComissao(input: CalcInput): Promise<CalcResult> {
  const { tipo_proposta_codigo, valor_contratado, taxa_juros, prazo } = input;

  const isConsorcio = tipo_proposta_codigo.startsWith("CONSORCIO_");

  // Buscar faixas do tipo
  let query = supabase
    .from("tabela_comissao")
    .select("*")
    .eq("tipo_proposta_codigo", tipo_proposta_codigo);

  const { data: faixas, error } = await query;

  if (error || !faixas || faixas.length === 0) {
    throw new Error(`Nenhuma faixa encontrada para ${tipo_proposta_codigo}`);
  }

  // Produtos de valor fixo (conta, cap, dental)
  const faixaFixa = faixas.find((f: any) => f.comissao_fixa !== null && f.comissao_pct === null);
  if (faixaFixa) {
    return {
      comissao_pct: null,
      comissao_fixa: faixaFixa.comissao_fixa,
      comissao_total: faixaFixa.comissao_fixa,
      is_consorcio: false,
    };
  }

  // Consórcio: comissão = valor × pct / 100
  if (isConsorcio) {
    const faixa = faixas[0];
    const total = valor_contratado * (faixa.comissao_pct / 100);
    return {
      comissao_pct: faixa.comissao_pct,
      comissao_fixa: null,
      comissao_total: Math.round(total * 100) / 100,
      is_consorcio: true,
    };
  }

  // Produtos com taxa + prazo: encontrar faixa correta
  if (taxa_juros == null || prazo == null) {
    throw new Error("Taxa e prazo são obrigatórios para este tipo de produto.");
  }

  const faixa = faixas.find((f: any) => {
    const taxaOk =
      (f.taxa_min === null || taxa_juros >= f.taxa_min) &&
      (f.taxa_max === null || taxa_juros <= f.taxa_max);
    const prazoOk =
      (f.prazo_min === null || prazo >= f.prazo_min) &&
      (f.prazo_max === null || prazo <= f.prazo_max);
    const tiqueteOk =
      f.tiquete_min === null || valor_contratado >= f.tiquete_min;
    return taxaOk && prazoOk && tiqueteOk;
  });

  if (!faixa) {
    throw new Error(
      `Nenhuma faixa de comissão encontrada para taxa ${taxa_juros}%, prazo ${prazo} meses, valor R$${valor_contratado}`
    );
  }

  const total = valor_contratado * (faixa.comissao_pct / 100);

  return {
    comissao_pct: faixa.comissao_pct,
    comissao_fixa: null,
    comissao_total: Math.round(total * 100) / 100,
    is_consorcio: false,
  };
}