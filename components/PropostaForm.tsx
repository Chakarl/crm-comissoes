"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useUsuario } from "@/hooks/useUsuario";
import { calcularComissao } from "@/lib/calcularComissao";
import { gerarParcelasConsorcio, gerarParcelaUnica } from "@/lib/gerarParcelas";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, UserPlus } from "lucide-react";

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

const TIPOS_VALOR_FIXO: Record<string, number> = {
  CONTA_PF: 0,
  CONTA_PJ: 0,
  PORT_SALARIO: 0,
  PORT_INSS: 0,
  CAP_UNICO_1000: 1000,
  CAP_UNICO_2000: 2000,
  CAP_MENSAL_4800: 4800,
  CAP_MENSAL_7200: 7200,
  CAP_MENSAL_3000: 3000,
  BB_DENTAL_MENSAL: 0,
  BB_DENTAL_ANUAL: 0,
};

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

function maskBRL(v: string) {
  const nums = v.replace(/\D/g, "");
  if (!nums) return "";
  const centavos = parseInt(nums, 10);
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseBRL(v: string): number {
  const nums = v.replace(/\D/g, "");
  if (!nums) return 0;
  return parseInt(nums, 10) / 100;
}

export function PropostaForm() {
  const { usuario, loading: loadingUser } = useUsuario();
  const router = useRouter();
  const [tipos, setTipos] = useState<TipoProposta[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [buscandoCpf, setBuscandoCpf] = useState(false);
  const [clienteEncontrado, setClienteEncontrado] = useState(false);
  const [clienteId, setClienteId] = useState<string | null>(null);

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

  useEffect(() => {
    const cpfLimpo = form.cpf_cliente.replace(/\D/g, "");

    if (cpfLimpo.length !== 11) {
      setClienteEncontrado(false);
      setClienteId(null);
      return;
    }

    const cpfMascara = `${cpfLimpo.slice(0, 3)}.${cpfLimpo.slice(3, 6)}.${cpfLimpo.slice(6, 9)}-${cpfLimpo.slice(9)}`;

    const timeout = setTimeout(async () => {
      setBuscandoCpf(true);
      try {
        let query = supabase
          .from("clientes")
          .select("*")
          .or(`cpf.eq.${cpfMascara},cpf.eq.${cpfLimpo}`)
          .limit(1);

        if (usuario && !usuario.is_master) {
          query = query.eq("usuario_id", usuario.id);
        }

        const { data } = await query.maybeSingle();

        if (data) {
          setClienteEncontrado(true);
          setClienteId(data.id);
          setForm((prev) => ({
            ...prev,
            nome_cliente: data.nome || prev.nome_cliente,
            telefone_cliente: data.telefone ? maskTelefone(data.telefone) : prev.telefone_cliente,
            agencia_cliente: data.agencia || prev.agencia_cliente,
            conta_cliente: data.conta || prev.conta_cliente,
          }));
        } else {
          setClienteEncontrado(false);
          setClienteId(null);
        }
      } catch (err) {
        console.error("Erro busca CPF:", err);
        setClienteEncontrado(false);
        setClienteId(null);
      } finally {
        setBuscandoCpf(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [form.cpf_cliente, usuario]);

  const precisaTaxa = !TIPOS_SEM_TAXA.includes(form.tipo_proposta_codigo);
  const precisaPrazo = !TIPOS_SEM_PRAZO.includes(form.tipo_proposta_codigo);

  // ★ NOVO — define se precisa digitar valor
  const valorFixo = TIPOS_VALOR_FIXO[form.tipo_proposta_codigo];
  const precisaValor = valorFixo === undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario) {
      setErro("Usuário não autenticado. Faça login novamente.");
      return;
    }
    setLoading(true);
    setErro(null);
    setResultado(null);

    try {
      // ★ ALTERADO — usa valor fixo quando o tipo não pede input
      const valor = precisaValor ? parseBRL(form.valor_contratado) : (valorFixo ?? 0);
      if (precisaValor && valor <= 0) throw new Error("Informe um valor contratado válido.");

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

      const cpfLimpo = form.cpf_cliente.replace(/\D/g, "");
      const cpfMascara = cpfLimpo.length === 11
        ? `${cpfLimpo.slice(0, 3)}.${cpfLimpo.slice(3, 6)}.${cpfLimpo.slice(6, 9)}-${cpfLimpo.slice(9)}`
        : "";
      let idCliente = clienteId;

      if (cpfLimpo.length === 11 && !idCliente) {
        const { data: novoCli, error: errCli } = await supabase
          .from("clientes")
          .insert({
            nome: form.nome_cliente,
            cpf: cpfMascara,
            telefone: form.telefone_cliente.replace(/\D/g, "") || null,
            agencia: form.agencia_cliente || null,
            conta: form.conta_cliente || null,
            data_cadastro: form.data_proposta,
            usuario_id: usuario.id,
          })
          .select("id")
          .single();
        if (errCli) throw errCli;
        idCliente = novoCli.id;
      }

      const { data: proposta, error: errProp } = await supabase
        .from("propostas")
        .insert({
          numero_proposta: form.numero_proposta || null,   // ★ ALTERADO — null se vazio
          data_proposta: form.data_proposta,
          tipo_proposta_codigo: form.tipo_proposta_codigo,
          nome_cliente: form.nome_cliente,
          cpf_cliente: cpfMascara || null,
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
          cliente_id: idCliente,
          user_id: user.id,
          usuario_id: usuario.id,
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
        cpf_cliente: "",
        telefone_cliente: "",
        agencia_cliente: "",
        conta_cliente: "",
        valor_contratado: "",
        taxa_juros: "",
        prazo: "",
      });
      setClienteEncontrado(false);
      setClienteId(null);
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

  const cpfCompleto = form.cpf_cliente.replace(/\D/g, "").length === 11;

  if (loadingUser) {
    return <p className="text-sm text-gray-500">Carregando usuário...</p>;
  }

  return (
    <div className="flex justify-center">
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-2xl">

        {/* ★ ALTERADO — só Data, sem Nº Proposta */}
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

        {/* CPF com busca automática */}
        <div>
          <label className="block text-sm font-medium mb-1">CPF</label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={form.cpf_cliente}
              onChange={(e) => setForm({ ...form, cpf_cliente: maskCPF(e.target.value) })}
              className="w-full border rounded-lg px-3 py-2 pr-10 text-sm"
              placeholder="000.000.000-00"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {buscandoCpf && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
              {!buscandoCpf && clienteEncontrado && <CheckCircle className="w-4 h-4 text-emerald-500" />}
            </div>
          </div>

          {cpfCompleto && !buscandoCpf && (
            <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              clienteEncontrado
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {clienteEncontrado ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Cliente encontrado — campos preenchidos
                </>
              ) : (
                <>
                  <UserPlus className="w-3 h-3" />
                  Novo cliente — preencha os dados
                </>
              )}
            </div>
          )}
        </div>

        {/* Nome */}
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

        {/* ★ Valor Contratado — só aparece quando necessário */}
        {precisaValor && (
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
        )}

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