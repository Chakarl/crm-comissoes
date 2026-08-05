'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

interface Usuario {
  id: string
  nome: string
  email: string
  telefone: string
  endereco: string
  is_master: boolean
}

export default function MinhaContaPage() {
  const supabase = createClient()

  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showSenhaAtual, setShowSenhaAtual] = useState(false)
  const [showNovaSenha, setShowNovaSenha] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)

  const [loading, setLoading] = useState(true)
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [msgPerfil, setMsgPerfil] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [msgSenha, setMsgSenha] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    loadUsuario()
  }, [])

  const loadUsuario = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('usuarios')
        .select('id, nome, email, telefone, endereco, is_master')
        .eq('id', user.id)
        .single()

      if (data) {
        setUsuario(data)
        setNome(data.nome || '')
        setTelefone(data.telefone || '')
        setEndereco(data.endereco || '')
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err)
    } finally {
      setLoading(false)
    }
  }

  /* ── Salvar dados pessoais ── */
  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuario) return
    setSalvandoPerfil(true)
    setMsgPerfil(null)

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nome: nome.trim(),
          telefone: telefone.trim(),
          endereco: endereco.trim(),
        })
        .eq('id', usuario.id)

      if (error) throw error

      await supabase.auth.updateUser({
        data: { nome_completo: nome.trim(), telefone: telefone.trim() },
      })

      setMsgPerfil({ tipo: 'ok', texto: 'Dados atualizados com sucesso!' })
    } catch (err: any) {
      setMsgPerfil({ tipo: 'erro', texto: err.message || 'Erro ao salvar dados.' })
    } finally {
      setSalvandoPerfil(false)
      setTimeout(() => setMsgPerfil(null), 4000)
    }
  }

  /* ── Trocar senha ── */
  const handleTrocarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsgSenha(null)

    if (novaSenha.length < 6) {
      setMsgSenha({ tipo: 'erro', texto: 'A nova senha deve ter no mínimo 6 caracteres.' })
      return
    }
    if (novaSenha !== confirmarSenha) {
      setMsgSenha({ tipo: 'erro', texto: 'As senhas não coincidem.' })
      return
    }

    setSalvandoSenha(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Usuário não encontrado.')

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: senhaAtual,
      })
      if (loginError) {
        setMsgSenha({ tipo: 'erro', texto: 'Senha atual incorreta.' })
        setSalvandoSenha(false)
        return
      }

      const { error } = await supabase.auth.updateUser({ password: novaSenha })
      if (error) throw error

      setMsgSenha({ tipo: 'ok', texto: 'Senha alterada com sucesso!' })
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
    } catch (err: any) {
      setMsgSenha({ tipo: 'erro', texto: err.message || 'Erro ao trocar senha.' })
    } finally {
      setSalvandoSenha(false)
      setTimeout(() => setMsgSenha(null), 4000)
    }
  }

  /* ── Máscara telefone ── */
  const maskTelefone = (v: string) => {
    const nums = v.replace(/\D/g, '').slice(0, 11)
    if (nums.length <= 2) return `(${nums}`
    if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
  }

  /* ── Força da senha ── */
  const getStrength = (s: string) =>
    (s.length >= 6 ? 1 : 0) +
    (/[A-Z]/.test(s) ? 1 : 0) +
    (/[0-9]/.test(s) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(s) ? 1 : 0)

  const strengthColor = (str: number) =>
    str <= 1 ? 'bg-red-400' : str === 2 ? 'bg-amber-400' : str === 3 ? 'bg-blue-400' : 'bg-emerald-400'

  const strengthLabel = (str: number) =>
    str <= 1 ? 'Fraca' : str === 2 ? 'Razoável' : str === 3 ? 'Boa' : 'Forte'

  /* ── Componentes auxiliares ── */
  const SenhaInput = ({
    label,
    value,
    onChange,
    show,
    toggleShow,
    placeholder,
  }: {
    label: string
    value: string
    onChange: (v: string) => void
    show: boolean
    toggleShow: () => void
    placeholder: string
  }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-11 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        <button
          type="button"
          onClick={toggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )

  const Toast = ({ msg }: { msg: { tipo: 'ok' | 'erro'; texto: string } }) => (
    <div
      className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
        msg.tipo === 'ok'
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}
    >
      {msg.tipo === 'ok' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg.texto}
    </div>
  )

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Carregando...</div>
      </div>
    )
  }

  /* ── Render ── */
  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-8 px-4 space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Minha Conta</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie seus dados pessoais e senha de acesso.
        </p>
      </div>

      {/* ── CARD DADOS PESSOAIS ── */}
      <form
        onSubmit={handleSalvarPerfil}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-5"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">Dados Pessoais</h2>
            <p className="text-xs text-slate-500">Informações do seu perfil</p>
          </div>
        </div>

        {/* E-mail (readonly) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              value={usuario?.email || ''}
              disabled
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            O e-mail é definido pelo administrador e não pode ser alterado.
          </p>
        </div>

        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome completo</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Telefone */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(maskTelefone(e.target.value))}
              placeholder="(00) 00000-0000"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Endereço */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Endereço</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <textarea
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, número, bairro, cidade - UF"
              rows={2}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {msgPerfil && <Toast msg={msgPerfil} />}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={salvandoPerfil}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {salvandoPerfil ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>

      {/* ── CARD TROCAR SENHA ── */}
      <form
        onSubmit={handleTrocarSenha}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-5"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">Alterar Senha</h2>
            <p className="text-xs text-slate-500">Mínimo de 6 caracteres</p>
          </div>
        </div>

        <SenhaInput
          label="Senha atual"
          value={senhaAtual}
          onChange={setSenhaAtual}
          show={showSenhaAtual}
          toggleShow={() => setShowSenhaAtual(!showSenhaAtual)}
          placeholder="Digite sua senha atual"
        />

        <SenhaInput
          label="Nova senha"
          value={novaSenha}
          onChange={setNovaSenha}
          show={showNovaSenha}
          toggleShow={() => setShowNovaSenha(!showNovaSenha)}
          placeholder="Mínimo 6 caracteres"
        />

        {/* Indicador de força */}
        {novaSenha.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((level) => {
                const str = getStrength(novaSenha)
                return (
                  <div
                    key={level}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      level <= str ? strengthColor(str) : 'bg-slate-200'
                    }`}
                  />
                )
              })}
            </div>
            <p className="text-xs text-slate-500">
              Força: <span className="font-medium">{strengthLabel(getStrength(novaSenha))}</span> — use maiúsculas, números e caracteres especiais.
            </p>
          </div>
        )}

        <SenhaInput
          label="Confirmar nova senha"
          value={confirmarSenha}
          onChange={setConfirmarSenha}
          show={showConfirmar}
          toggleShow={() => setShowConfirmar(!showConfirmar)}
          placeholder="Repita a nova senha"
        />

        {/* Feedback de match em tempo real */}
        {confirmarSenha.length > 0 && (
          <p
            className={`text-xs ${
              novaSenha === confirmarSenha ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {novaSenha === confirmarSenha ? '✓ Senhas coincidem' : '✗ Senhas não coincidem'}
          </p>
        )}

        {msgSenha && <Toast msg={msgSenha} />}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={salvandoSenha}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {salvandoSenha ? 'Alterando...' : 'Alterar senha'}
          </button>
        </div>
      </form>
    </div>
  )
}