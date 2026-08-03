import { addMonths, startOfMonth } from "date-fns";

interface ParcelaInput {
  proposta_id: string;
  data_proposta: string; // "YYYY-MM-DD"
  comissao_total: number;
  tipo_proposta_codigo: string;
}

interface Parcela {
  proposta_id: string;
  numero_parcela: number;
  valor: number;
  mes_referencia: string; // "YYYY-MM-DD" (primeiro dia do mês)
}

export function gerarParcelasConsorcio(input: ParcelaInput): Parcela[] {
  const { proposta_id, data_proposta, comissao_total, tipo_proposta_codigo } = input;

  const isImovel = tipo_proposta_codigo === "CONSORCIO_IMOVEL";
  const numParcelas = isImovel ? 10 : 5;
  const valorParcela = Math.round((comissao_total / numParcelas) * 100) / 100;

  // Ajuste de arredondamento na última parcela
  const valorUltima = Math.round((comissao_total - valorParcela * (numParcelas - 1)) * 100) / 100;

  const dataRef = new Date(data_proposta + "T12:00:00");
  const dia = dataRef.getDate();

  // Se antes ou no dia 25: primeira parcela no mês atual
  // Se depois do dia 25: primeira parcela no mês seguinte
  let mesInicio: Date;
  if (dia <= 25) {
    mesInicio = startOfMonth(dataRef);
  } else {
    mesInicio = startOfMonth(addMonths(dataRef, 1));
  }

  const parcelas: Parcela[] = [];
  for (let i = 0; i < numParcelas; i++) {
    const mesRef = addMonths(mesInicio, i);
    parcelas.push({
      proposta_id,
      numero_parcela: i + 1,
      valor: i === numParcelas - 1 ? valorUltima : valorParcela,
      mes_referencia: mesRef.toISOString().split("T")[0],
    });
  }

  return parcelas;
}

// Para não-consórcio: uma única "parcela" no mês da proposta
export function gerarParcelaUnica(input: Omit<ParcelaInput, "tipo_proposta_codigo">): Parcela[] {
  const dataRef = new Date(input.data_proposta + "T12:00:00");
  const mesRef = startOfMonth(dataRef);
  return [
    {
      proposta_id: input.proposta_id,
      numero_parcela: 1,
      valor: input.comissao_total,
      mes_referencia: mesRef.toISOString().split("T")[0],
    },
  ];
}