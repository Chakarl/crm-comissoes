"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ParcelaMes {
  mes_referencia: string;
  total: number;
  qtd: number;
}

export function ComissaoMensal() {
  const [dados, setDados] = useState<ParcelaMes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("parcelas_comissao")
        .select("mes_referencia, valor")
        .order("mes_referencia", { ascending: false });

      if (data) {
        const agrupado: Record<string, { total: number; qtd: number }> = {};
        for (const p of data) {
          const key = p.mes_referencia;
          if (!agrupado[key]) agrupado[key] = { total: 0, qtd: 0 };
          agrupado[key].total += p.valor;
          agrupado[key].qtd += 1;
        }
        setDados(
          Object.entries(agrupado).map(([mes, v]) => ({
            mes_referencia: mes,
            total: v.total,
            qtd: v.qtd,
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Carregando...</p>;

  if (dados.length === 0)
    return <p className="text-sm text-gray-500">Nenhuma comissão registrada.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {dados.map((d) => {
        const [ano, mes] = d.mes_referencia.split("-");
        const label = `${mes}/${ano}`;
        return (
          <div
            key={d.mes_referencia}
            className="bg-white border rounded-xl shadow-sm p-4"
          >
            <p className="text-sm text-gray-500">Mês</p>
            <p className="text-xl font-bold">{label}</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {d.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="text-xs text-gray-400 mt-1">{d.qtd} parcela(s)</p>
          </div>
        );
      })}
    </div>
  );
}