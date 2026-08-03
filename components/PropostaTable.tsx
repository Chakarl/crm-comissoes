"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Proposta {
  id: string;
  numero_proposta: string;
  data_proposta: string;
  tipo_proposta_codigo: string;
  nome_cliente: string;
  valor_contratado: number;
  taxa_juros: number | null;
  prazo: number | null;
  comissao_pct: number | null;
  comissao_total: number;
  is_consorcio: boolean;
}

export function PropostaTable() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("propostas")
      .select("*")
      .order("data_proposta", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setPropostas(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Carregando...</p>;

  if (propostas.length === 0)
    return <p className="text-sm text-gray-500">Nenhuma proposta cadastrada.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 text-left">Proposta</th>
            <th className="px-3 py-2 text-left">Data</th>
            <th className="px-3 py-2 text-left">Tipo</th>
            <th className="px-3 py-2 text-left">Cliente</th>
            <th className="px-3 py-2 text-right">Valor</th>
            <th className="px-3 py-2 text-right">Taxa</th>
            <th className="px-3 py-2 text-right">Prazo</th>
            <th className="px-3 py-2 text-right">Comissão %</th>
            <th className="px-3 py-2 text-right">Comissão R$</th>
          </tr>
        </thead>
        <tbody>
          {propostas.map((p) => (
            <tr key={p.id} className="border-t hover:bg-gray-50">
              <td className="px-3 py-2">{p.numero_proposta}</td>
              <td className="px-3 py-2">
                {new Date(p.data_proposta + "T12:00:00").toLocaleDateString("pt-BR")}
              </td>
              <td className="px-3 py-2 text-xs">
                {p.tipo_proposta_codigo.replace(/_/g, " ")}
                {p.is_consorcio && (
                  <span className="ml-1 text-amber-600 font-semibold">(parcelas)</span>
                )}
              </td>
              <td className="px-3 py-2">{p.nome_cliente}</td>
              <td className="px-3 py-2 text-right">
                {p.valor_contratado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </td>
              <td className="px-3 py-2 text-right">
                {p.taxa_juros ? `${p.taxa_juros}%` : "-"}
              </td>
              <td className="px-3 py-2 text-right">
                {p.prazo ? `${p.prazo}m` : "-"}
              </td>
              <td className="px-3 py-2 text-right">
                {p.comissao_pct ? `${p.comissao_pct}%` : "-"}
              </td>
              <td className="px-3 py-2 text-right font-semibold text-green-700">
                {p.comissao_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}