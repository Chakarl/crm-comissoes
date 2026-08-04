"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginacaoProps {
  paginaAtual: number;
  totalPaginas: number;
  onMudar: (pagina: number) => void;
}

export function Paginacao({ paginaAtual, totalPaginas, onMudar }: PaginacaoProps) {
  if (totalPaginas <= 1) return null;

  // Monta range de páginas visíveis (máx 5)
  const range: number[] = [];
  let inicio = Math.max(1, paginaAtual - 2);
  let fim = Math.min(totalPaginas, inicio + 4);
  if (fim - inicio < 4) inicio = Math.max(1, fim - 4);

  for (let i = inicio; i <= fim; i++) range.push(i);

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onMudar(paginaAtual - 1)}
        disabled={paginaAtual === 1}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {inicio > 1 && (
        <>
          <button
            onClick={() => onMudar(1)}
            className="w-9 h-9 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            1
          </button>
          {inicio > 2 && <span className="text-slate-400 px-1">…</span>}
        </>
      )}

      {range.map((p) => (
        <button
          key={p}
          onClick={() => onMudar(p)}
          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
            p === paginaAtual
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {p}
        </button>
      ))}

      {fim < totalPaginas && (
        <>
          {fim < totalPaginas - 1 && <span className="text-slate-400 px-1">…</span>}
          <button
            onClick={() => onMudar(totalPaginas)}
            className="w-9 h-9 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {totalPaginas}
          </button>
        </>
      )}

      <button
        onClick={() => onMudar(paginaAtual + 1)}
        disabled={paginaAtual === totalPaginas}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}