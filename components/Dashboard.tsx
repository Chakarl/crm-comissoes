"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function Dashboard() {
  const [stats, setStats] = useState({
    totalPropostas: 0,
    totalComissao: 0,
    comissaoMesAtual: 0,
  });

  useEffect(() => {
    async function load() {
      const { count } = await supabase
        .from("propostas")
        .select("*", { count: "exact", head: true });

      const { data: propostas } = await supabase
        .from("propostas")
        .select("comissao_total");

      const agora = new Date();
      const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-01`;

      const { data: parcMes } = await supabase
        .from("parcelas_comissao")
        .select("valor")
        .eq("mes_referencia", mesAtual);

      setStats({
        totalPropostas: count || 0,
        totalComissao: propostas?.reduce((s, p) => s + p.comissao_total, 0) || 0,
        comissaoMesAtual: parcMes?.reduce((s, p) => s + p.valor, 0) || 0,
      });
    }
    load();
  }, []);

  const cards = [
    { label: "Total de Propostas", value: stats.totalPropostas.toString(), color: "text-primary" },
    {
      label: "Comissão Total (acumulada)",
      value: stats.totalComissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      color: "text-green-600",
    },
    {
      label: "Comissão no Mês Atual",
      value: stats.comissaoMesAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      color: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-sm text-gray-500">{c.label}</p>
          <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}