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
  "CONTA_PF","CONTA_PJ","PORT_SALARIO","PORT_INSS",
  "CAP_UNICO_1000","CAP_UNICO_2000","CAP_MENSAL_4800",
  "CAP_MENSAL_7200","CAP_MENSAL_3000","BB_DENTAL_MENSAL",
  "BB_DENTAL_ANUAL","CONSORCIO_IMOVEL","CONSORCIO_GERAL",
];

const TIPOS_SEM_PRAZO = [
  "CONTA_PF","CONTA_PJ","PORT_SALARIO","PORT_INSS",
  "CAP_UNICO_1000","CAP_UNICO_2000","CAP_MENSAL_4800",
  "CAP_MENSAL_7200","CAP_MENSAL_3000","BB_DENTAL_MENSAL",
  "BB_DENTAL_ANUAL","CONSORCIO_IMOVEL","CONSORCIO_GERAL",
];

/* ─── Máscaras ─── */
function maskCPF(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskTelefone(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

// Formata centavos → "R$ 1.234,56"
function maskBRL(v: string) {
  const nums = v.replace(/\D/g, "");
  if (!nums) return "";
  const centavos = parseInt(nums, 10);
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Extrai float de "R$ 1.234,56" → 1234.56
function parseBRL(v: string): number {
  const nums = v.replace(/\D/g, "");
  if (!nums) return 0;
  return parseInt(nums, 10) / 100;
}

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
    cpf_cliente: "",
    telefone_cliente: "",
    agencia_cliente: "",
    conta_cliente: "",
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
      const valor = parseBRL(form.valor_contratado);
      if (valor <= 0) throw new Error("Informe um valor contratado válido.");

      const taxa = precisaTaxa ? parseFloat(form.taxa_juros) : null;
      const prazo = precisaPrazo ? parseInt(form.prazo) : null;

      const calc = await calcularComissao({
        tipo_proposta_codigo: form.tipo_proposta_codigo,
        valor_contratado: valor,
        taxa_juros: taxa,
        prazo: prazo,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado. Faça login novamente.");

      /* ─── Upsert cliente ─── */
      const cpfLimpo = form.cpf_cliente.replace(/\D/g, "");
      let clienteId: string | null = null;

      if (cpfLimpo.length === 11) {
        const { data: clienteExistente } = await supabase
          .from("clientes")
          .select("id")
          .eq("cpf", cpfLimpo)
          .maybeSingle();

        if (clienteExistente) {
          clienteId = clienteExistente.id;
          await supabase.from("clientes").update({
            nome: form.nome_cliente,
            telefone: form.telefone_cliente.replace(/\D/g, "") || null,
            agencia: form.agencia_cliente || null,
            conta: form.conta_cliente || null,
          }).eq("id", clienteId);
        } else {
          const { data: novoCli, error: errCli } = await supabase
            .from("clientes")
            .insert({
              nome: form.nome_cliente,
              cpf: cpfLimpo,
              telefone: form.telefone_cliente.replace(/\D/g, "") || null,
              agencia: form.agencia_cliente || null,
              conta: form.conta_cliente || null,
            })
            .select("id")
            .single();
          if (errCli) throw errCli;
          clienteId = novoCli.id;
        }
      }

      /* ─── Salva proposta ─── */
      const { data: proposta, error: errProp } = await supabase
        .from("propostas")
        .insert({
          numero_proposta: form.numero_proposta,
          data_proposta: form.data_proposta,
          tipo_proposta_codigo: form.tipo_proposta_codigo,
          nome_cliente: form.nome_cliente,
          cpf_cliente: cpfLimpo || null,
          telefone_cliente: form.telefone_cliente.replace(/\D/g, "") || null,
          agencia_cliente: form.agencia_cliente || null,
          conta_cliente: form.conta_cliente || null,
          valor_contratado: valor,
          taxa_juros: taxa,
          prazo: prazo,
          prazo_meses: prazo,
          comissao_pct: calc.comissao_pct,
          comissao_total: calc.comissao_total,
          is_consorcio: calc.is_consorcio,
          cliente_id: clienteId,
          user_id: user.id,
        })
        .select()
        .single();

      if (errProp) throw errProp;

      /* ─── Parcelas ─── */
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
        cpf_cliente: "",
        telefone_cliente: "",
        agencia_cliente: "",
        conta_cliente: "",
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
    <div className="flex justify-center">
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-2xl">

        {/* Nº Proposta + Data */}
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

        {/* Tipo de Proposta */}
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

        {/* Nome + CPF */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium mb-1">CPF</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.cpf_cliente}
              onChange={(e) => setForm({ ...form, cpf_cliente: maskCPF(e.target.value) })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="000.000.000-00"
            />
          </div>
        </div>

        {/* Telefone + Agência + Conta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Telefone</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.telefone_cliente}
              onChange={(e) => setForm({ ...form, telefone_cliente: maskTelefone(e.target.value) })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Agência</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.agencia_cliente}
              onChange={(e) => setForm({ ...form, agencia_cliente: e.target.value.replace(/\D/g, "").slice(0, 6) })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="0000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Conta</label>
            <input
              type="text"
              value={form.conta_cliente}
              onChange={(e) => setForm({ ...form, conta_cliente: e.target.value.replace(/[^0-9Xx-]/g, "").slice(0, 15) })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="00000-0"
            />
          </div>
        </div>

        {/* Valor Contratado (R$) */}
        <div>
          <label className="block text-sm font-medium mb-1">Valor Contratado</label>
          <input
            required
            type="text"
            inputMode="numeric"
            value={form.valor_contratado}
            onChange={(e) => setForm({ ...form, valor_contratado: maskBRL(e.target.value) })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="R$ 0,00"
          />
        </div>

        {/* Taxa de Juros */}
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

        {/* Prazo */}
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

        {/* Botão */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Salvar Proposta"}
        </button>

        {/* Feedback */}
        {resultado && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
            {resultado}
          </div>
        )}
        {erro && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
            ❌ {erro}
          </div>
        )}
      </form>
    </div>
  );
}