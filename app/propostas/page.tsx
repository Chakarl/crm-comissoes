// app/propostas/nova/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useBuscaClienteCPF } from '@/hooks/useBuscaClienteCPF'
import {
  User,
  FileText,
  CheckCircle,
  Loader2,
  Search,
} from 'lucide-react'

export default function NovaPropostaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [salvando, setSalvando] = useState(false)

  // Campos do cliente
  const [cpf, setCpf] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [endereco, setEndereco] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [cep, setCep] = useState('')
  const [clienteId, setClienteId] = useState<string | null>(null)

  // Campos da proposta
  const [tipoProposta, setTipoProposta] = useState('')
  const [valorContratado, setValorContratado] = useState('')
  const [comissaoTotal, setComissaoTotal] = useState('')
  const [dataProposta, setDataProposta] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [numeroProposta, setNumeroProposta] = useState('')
  const [observacoes, setObservacoes] = useState('')

  // Hook de busca automática
  const { cliente, buscando, jaExiste } = useBuscaClienteCPF(cpf)

  // Quando encontrar cliente, preenche os campos automaticamente
  useEffect(() => {
    if (cliente) {
      setClienteId(cliente.id)
      setNome(cliente.nome || '')
      setTelefone(cliente.telefone || '')
      setEmail(cliente.email || '')
      setDataNascimento(cliente.data_nascimento || '')
      setEndereco(cliente.endereco || '')
      setCidade(cliente.cidade || '')
      setEstado(cliente.estado || '')
      setCep(cliente.cep || '')
    } else {
      setClienteId(null)
    }
  }, [cliente])

  // Máscara de CPF
  const handleCpfChange = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 11)
    const masked = nums
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    setCpf(masked)
  }

  // Limpar campos do cliente ao mudar CPF (se não encontrou)
  const limparCliente = () => {
    setClienteId(null)
    setNome('')
    setTelefone('')
    setEmail('')
    setDataNascimento('')
    setEndereco('')
    setCidade('')
    setEstado('')
    setCep('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)

    try {
      const cpfLimpo = cpf.replace(/\D/g, '')
      let idCliente = clienteId

      // Se cliente novo, cadastra primeiro
      if (!idCliente) {
        const { data: novoCliente, error: errCliente } = await supabase
          .from('clientes')
          .insert({
            cpf: cpfLimpo,
            nome,
            telefone,
            email,
            data_nascimento: dataNascimento || null,
            endereco,
            cidade,
            estado,
            cep,
          })
          .select('id')
          .single()

        if (errCliente) throw errCliente
        idCliente = novoCliente.id
      }

      // Cadastra a proposta
      const { error: errProposta } = await supabase.from('propostas').insert({
        cliente_id: idCliente,
        nome_cliente: nome,
        cpf_cliente: cpfLimpo,
        tipo_proposta_codigo: tipoProposta,
        valor_contratado: parseFloat(valorContratado) || 0,
        comissao_total: parseFloat(comissaoTotal) || 0,
        data_proposta: dataProposta,
        numero_proposta: numeroProposta,
        observacoes,
      })

      if (errProposta) throw errProposta

      // Se for consórcio, gera 5 parcelas
      const tipo = tipoProposta.toLowerCase()
      if (tipo.includes('consorcio') || tipo.includes('consórcio')) {
        const valorTotal = parseFloat(comissaoTotal) || 0
        const parcelaMensal = valorTotal / 5
        const parcelas = []

        for (let i = 1; i <= 5; i++) {
          const d = new Date(dataProposta)
          d.setMonth(d.getMonth() + i)
          const mesRef = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

          parcelas.push({
            proposta_id: idCliente, // ajuste se precisar do id da proposta
            mes_referencia: mesRef,
            parcela_numero: i,
            valor: parcelaMensal,
            status: 'pendente',
          })
        }

        if (parcelas.length > 0) {
          await supabase.from('parcelas_comissao').insert(parcelas)
        }
      }

      router.push('/propostas')
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar proposta. Verifique os dados.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Nova Proposta</h1>
          <p className="text-sm text-slate-600 mt-1">
            Digite o CPF para buscar cliente existente
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ─── SEÇÃO CLIENTE ─── */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">Dados do Cliente</h2>
            </div>

            {/* CPF com indicador de busca */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">CPF *</label>
              <div className="relative">
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => handleCpfChange(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {buscando && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                  {!buscando && jaExiste && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  {!buscando && !jaExiste && cpf.replace(/\D/g, '').length === 11 && (
                    <Search className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Badge cliente encontrado / novo */}
              {cpf.replace(/\D/g, '').length === 11 && !buscando && (
                <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  jaExiste
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {jaExiste ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      Cliente encontrado — campos preenchidos automaticamente
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3" />
                      Novo cliente — preencha os dados abaixo
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Grid de campos do cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo *</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={jaExiste}
                  className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                    jaExiste ? 'bg-slate-50 text-slate-600' : ''
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  disabled={jaExiste}
                  className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                    jaExiste ? 'bg-slate-50 text-slate-600' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={jaExiste}
                  className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                    jaExiste ? 'bg-slate-50 text-slate-600' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data de nascimento</label>
                <input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  disabled={jaExiste}
                  className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                    jaExiste ? 'bg-slate-50 text-slate-600' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                <input
                  type="text"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  disabled={jaExiste}
                  className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                    jaExiste ? 'bg-slate-50 text-slate-600' : ''
                  }`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  disabled={jaExiste}
                  className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                    jaExiste ? 'bg-slate-50 text-slate-600' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  disabled={jaExiste}
                  className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                    jaExiste ? 'bg-slate-50 text-slate-600' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                <input
                  type="text"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  disabled={jaExiste}
                  className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                    jaExiste ? 'bg-slate-50 text-slate-600' : ''
                  }`}
                />
              </div>
            </div>
          </div>

          {/* ─── SEÇÃO PROPOSTA ─── */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-slate-900">Dados da Proposta</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Proposta *</label>
                <select
                  value={tipoProposta}
                  onChange={(e) => setTipoProposta(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione...</option>
                  <option value="consorcio">Consórcio</option>
                  <option value="seguro_auto">Seguro Auto</option>
                  <option value="seguro_vida">Seguro Vida</option>
                  <option value="seguro_residencial">Seguro Residencial</option>
                  <option value="previdencia">Previdência</option>
                  <option value="capitalizacao">Capitalização</option>
                  <option value="financiamento">Financiamento</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nº da Proposta</label>
                <input
                  type="text"
                  value={numeroProposta}
                  onChange={(e) => setNumeroProposta(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor Contratado *</label>
                <input
                  type="number"
                  step="0.01"
                  value={valorContratado}
                  onChange={(e) => setValorContratado(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Comissão Total *</label>
                <input
                  type="number"
                  step="0.01"
                  value={comissaoTotal}
                  onChange={(e) => setComissaoTotal(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {(tipoProposta.includes('consorcio') || tipoProposta.includes('consórcio')) && comissaoTotal && (
                  <p className="text-xs text-blue-600 mt-1">
                    💡 Consórcio: 5 parcelas de R$ {(parseFloat(comissaoTotal) / 5).toFixed(2)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data da Proposta *</label>
                <input
                  type="date"
                  value={dataProposta}
                  onChange={(e) => setDataProposta(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* ─── BOTÕES ─── */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Proposta'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}