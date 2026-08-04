"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { calcularComissao } from "@/lib/calcularComissao";
import { gerarParcelasConsorcio, gerarParcelaUnica } from "@/lib/gerarParcelas";
import { useRouter } from "next/navigation";

const supabase = createClient();

interface TipoProposta {
  id: number;
  codigo: string;
  nome: string;
  categoria: string;
}

const TIPOS_SEM_TAXA = [
  "CONTA_PF", "CONTA_PJ", "PORT_SALARIO", "PORT_INSS",
  "CAP_UNICO_1000", "CAP_UNICO_2000", "CAP_MENSAL_4800",
  "CAP_MENSAL_7200", "CAP_MENSAL_3000", "BB_DENTAL_MENSAL",
  "BB_DENTAL_ANUAL", "CONSORCIO_IMOVEL", "CONSORCIO_GERAL",
];

const TIPOS_SEM_PRAZO = [
  "CONTA_PF", "CONTA_PJ", "PORT_SALARIO", "PORT_INSS",
  "CAP_UNICO_1000", "CAP_UNICO_2000", "CAP_MENSAL_4800",
  "CAP_MENSAL_7200", "CAP_MENSAL_3000", "BB_DENTAL_MENSAL",
  "BB_DENTAL_ANUAL", "CONSORCIO_IMOVEL", "CONSORCIO_GERAL",
];

export function PropostaForm() {
  const router = useRouter();
  const [tipos, setTipos] = useState<TipoProposta[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState({
    numero_proposta: "",
    data_proposta: new Date().toISOString().split("T")[0],
    tipo_proposta_codigo: "",
    nome_cliente: "",
    valor_contratado: "",
    taxa_juros: "",
    prazo: "",
  });

  useEffect(() => {
    supabase
      .from("tipos_proposta")
      .select("*")
      .order("categoria, nome")
      .then(({ data }) => {
        if (data) setTipos(data);
      });
  }, []);

  const precisaTaxa = !TIPOS_SEM_TAXA.includes(form.tipo_proposta_codigo);
  const precisaPrazo = !TIPOS_SEM_PRAZO.includes(form.tipo_proposta_codigo);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    setResultado(null);

    try {
      const valor = parseFloat(form.valor_contratado);
      const taxa = precisaTaxa ? parseFloat(form.taxa_juros) : null;
      const prazo = precisaPrazo ? parseInt(form.prazo) : null;

      const calc = await calcularComissao({
        tipo_proposta_codigo: form.tipo_proposta_codigo,
        valor_contratado: valor,
        taxa_juros: taxa,
        prazo: prazo,
      });

      const { data: proposta, error: errProp } = await supabase
        .from("propostas")
        .insert({
          numero_proposta: form.numero_proposta,
          data_proposta: form.data_proposta,
          tipo_proposta_codigo: form.tipo_proposta_codigo,
          nome_cliente: form.nome_cliente,
          valor_contratado: valor,
          taxa_juros: taxa,
          prazo: prazo,
          comissao_pct: calc.comissao_pct,
          comissao_total: calc.comissao_total,
          is_consorcio: calc.is_consorcio,
        })
        .select()
        .single();

      if (errProp) throw errProp;

      let parcelas;
      if (calc.is_consorcio) {
        parcelas = gerarParcelasConsorcio({
          proposta_id: proposta.id,
          data_proposta: form.data_proposta,
          comissao_total: calc.comissao_total,
          tipo_proposta_codigo: form.tipo_proposta_codigo,
        });
      } else {
        parcelas = gerarParcelaUnica({
          proposta_id: proposta.id,
          data_proposta: form.data_proposta,
          comissao_total: calc.comissao_total,
        });
      }

      const { error: errParc } = await supabase
        .from("parcelas_comissao")
        .insert(parcelas);

      if (errParc) throw errParc;

      const pctStr = calc.comissao_pct
        ? `${calc.comissao_pct}%`
        : `R$ ${calc.comissao_fixa?.toFixed(2)} (fixo)`;

      setResultado(
        `✅ Proposta salva! Comissão: ${pctStr} → R$ ${calc.comissao_total.toFixed(2)}` +
          (calc.is_consorcio
            ? ` (dividida em ${parcelas.length} parcelas de R$ ${parcelas[0].valor.toFixed(2)})`
            : "")
      );

      setForm({
        numero_proposta: "",
        data_proposta: new Date().toISOString().split("T")[0],
        tipo_proposta_codigo: "",
        nome_cliente: "",
        valor_contratado: "",
        taxa_juros: "",
        prazo: "",
      });
    } catch (err: any) {
      setErro(err.message || "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  const categorias = tipos.reduce<Record<string, TipoProposta[]>>((acc, t) => {
    if (!acc[t.categoria]) acc[t.categoria] = [];
    acc[t.categoria].push(t);
    return acc;
  }, {});

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nº Proposta</label>
          <input
            required
            type="text"
            value={form.numero_proposta}
            onChange={(e) => setForm({ ...form, numero_proposta: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Ex: 123456"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Data</label>
          <input
            required
            type="date"
            value={form.data_proposta}
            onChange={(e) => setForm({ ...form, data_proposta: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Tipo de Proposta</label>
        <select
          required
          value={form.tipo_proposta_codigo}
          onChange={(e) => setForm({ ...form, tipo_proposta_codigo: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Selecione...</option>
          {Object.entries(categorias).map(([cat, lista]) => (
            <optgroup key={cat} label={cat}>
              {lista.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.nome}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Nome do Cliente</label>
        <input
          required
          type="text"
          value={form.nome_cliente}
          onChange={(e) => setForm({ ...form, nome_cliente: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Nome completo"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Valor Contratado (R$)</label>
        <input
          required
          type="number"
          step="0.01"
          min="0"
          value={form.valor_contratado}
          onChange={(e) => setForm({ ...form, valor_contratado: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Ex: 50000.00"
        />
      </div>

      {precisaTaxa && (
        <div>
          <label className="block text-sm font-medium mb-1">Taxa de Juros (% a.m)</label>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={form.taxa_juros}
            onChange={(e) => setForm({ ...form, taxa_juros: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Ex: 2.15"
          />
        </div>
      )}

      {precisaPrazo && (
        <div>
          <label className="block text-sm font-medium mb-1">Prazo (meses)</label>
          <input
            required
            type="number"
            min="1"
            value={form.prazo}
            onChange={(e) => setForm({ ...form, prazo: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Ex: 60"
          />
        </div>
      )}

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          ❌ {erro}
        </div>
      )}

      {resultado && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          {resultado}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg disabled:opacity-50 transition-colors"
      >
        {loading ? "Salvando..." : "💾 Salvar Proposta"}
      </button>
    </form>
  );
}