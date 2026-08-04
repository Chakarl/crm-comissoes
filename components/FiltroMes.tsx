"use client";

import { useMemo } from "react";

interface FiltroMesProps {
  /** "YYYY-MM" ou null para "Todos" */
  mesSelecionado: string | null;
  onSelecionar: (mes: string | null) => void;
  /** Lista de datas ISO (YYYY-MM-DD) para extrair os meses disponíveis */
  datasDisponiveis: string[];
}

const NOMES_MES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function FiltroMes({ mesSelecionado, onSelecionar, datasDisponiveis }: FiltroMesProps) {
  const meses = useMemo(() => {
    const set = new Set<string>();
    datasDisponiveis.forEach((d) => {
      if (d) set.add(d.slice(0, 7)); // "YYYY-MM"
    });

    // Garante o mês atual sempre apareça
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    set.add(mesAtual);

    return Array.from(set).sort();
  }, [datasDisponiveis]);

  const formatLabel = (ym: string) => {
    const [ano, mes] = ym.split("-");
    return `${NOMES_MES[parseInt(mes, 10) - 1]}/${ano}`;
  };

  // Mês atual para destacar como default
  const hoje = new Date();
  const mesAtualKey = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onSelecionar(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mesSelecionado === null
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Todos
        </button>

        {meses.map((m) => (
          <button
            key={m}
            onClick={() => onSelecionar(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mesSelecionado === m
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {formatLabel(m)}
          </button>
        ))}
      </div>
    </div>
  );
}