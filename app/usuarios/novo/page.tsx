'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useUsuario } from '@/hooks/useUsuario'
import { UserPlus, User, Mail, Phone, MapPin, Lock, Copy, Check, AlertCircle, Loader2, Crown } from 'lucide-react'
import { useRouter } from 'next/navigation'

function formatarTelefone(valor: string): string {
  const numeros = valor.replace(/\D/g, '')
  
  if (numeros.length <= 10) {
    return numeros
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  } else {
    return numeros
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15)
  }
}

export default function NovoUsuarioPage() {
  const { usuario, loading: loadingUser } = useUsuario()
  const router = useRouter()
  const supabase = createClient()

  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [showPopup, setShowPopup] = useState(false)

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [senha, setSenha] = useState('')
  const [senhaCopied, setSenhaCopied] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!loadingUser) {
      if (!usuario?.is_master) {
        router.push('/dashboard')
      } else {
        console.log('👤 Usuário master detectado, carregando lista...')
        gerarSenha()
        carregarUsuarios()
      }
    }
  }, [loadingUser, usuario, router])

  const gerarSenha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
    let novaSenha = ''
    for (let i = 0; i < 8; i++) {
      novaSenha += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setSenha(novaSenha)
    setSenhaCopied(false)
  }

  const copiarSenha = () => {
    navigator.clipboard.writeText(senha)
    setSenhaCopied(true)
    setTimeout(() => setSenhaCopied(false), 2000)
  }

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarTelefone(e.target.value)
    setTelefone(valorFormatado)
  }

  const carregarUsuarios = async () => {
    try {
      setLoading(true)
      console.log('🔄 Carregando usuários...')
      
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      console.log('🔑 Token:', token ? 'OK' : 'Ausente')

      if (!token) {
        console.error('❌ Sem token')
        setLoading(false)
        return
      }

      const res = await fetch(`/api/usuarios?token=${token}`)
      console.log('📥 Status da resposta:', res.status)

      const textoResposta = await res.text()
      console.log('📄 Resposta completa (texto):', textoResposta)

      let data
      try {
        data = JSON.parse(textoResposta)
      } catch (parseError) {
        console.error('❌ Erro ao fazer parse do JSON:', parseError)
        console.error('📄 Texto recebido:', textoResposta)
        setLoading(false)
        return
      }

      console.log('📥 Dados parseados:', data)
      
      if (res.ok && Array.isArray(data)) {
        setUsuarios(data)
        console.log(`✅ ${data.length} usuários carregados`)
      } else {
        console.error('❌ Erro ao carregar:', data)
        setUsuarios([])
      }
      
    } catch (error) {
      console.error('❌ Erro no carregamento:', error)
      setUsuarios([])
    } finally {
      setLoading(false)
    }
  }

  const validarCampos = () => {
    if (!nome.trim()) {
      setErro('O campo Nome é obrigatório')
      return false
    }

    if (!email.trim()) {
      setErro('O campo Email é obrigatório')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setErro('Digite um email válido')
      return false
    }

    if (!telefone.trim()) {
      setErro('O campo Telefone é obrigatório')
      return false
    }

    const numeros = telefone.replace(/\D/g, '')
    if (numeros.length < 10 || numeros.length > 11) {
      setErro('Digite um telefone válido com DDD')
      return false
    }

    if (!senha.trim() || senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres')
      return false
    }

    return true
  }

  const cadastrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)

    if (!validarCampos()) {
      return
    }

    setSalvando(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        setErro('Sessão inválida. Faça login novamente.')
        setSalvando(false)
        return
      }

      const payload = { 
        email, 
        senha, 
        nome,
        telefone,
        endereco: endereco.trim() || null,
        token 
      }

      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      let data
      try {
        data = await res.json()
      } catch {
        setErro('Erro ao processar resposta do servidor')
        setSalvando(false)
        return
      }

      if (!res.ok) {
        if (typeof data.erro === 'string') {
          setErro(data.erro)
        } else if (data.message) {
          setErro(data.message)
        } else if (data.error) {
          setErro(data.error)
        } else {
          setErro(`Erro ao cadastrar usuário (${res.status})`)
        }
        setSalvando(false)
        return
      }

      setNome('')
      setEmail('')
      setTelefone('')
      setEndereco('')
      gerarSenha()
      setErro(null)

      await carregarUsuarios()
      
      setShowPopup(true)
      setTimeout(() => setShowPopup(false), 4000)
      
    } catch (err: any) {
      console.error('Erro ao cadastrar:', err)
      setErro(err.message || 'Erro inesperado ao cadastrar')
    } finally {
      setSalvando(false)
    }
  }

  if (loadingUser || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!usuario?.is_master) return null

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {showPopup && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-top">
          <Check className="w-6 h-6" />
          <div>
            <p className="font-semibold">✅ Usuário cadastrado com sucesso!</p>
            <p className="text-sm opacity-90">Email com credenciais enviado</p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-blue-600" />
            Gerenciar Usuários
          </h1>
          <p className="text-slate-600 mt-2">Cadastre novos corretores no sistema</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Novo Usuário
            </h2>

            <form onSubmit={cadastrar} className="space-y-4">
              {erro && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">{erro}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={salvando}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={salvando}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                  placeholder="usuario@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefone *
                </label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={handleTelefoneChange}
                  disabled={salvando}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Endereço
                </label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  disabled={salvando}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Senha Gerada Automaticamente *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={senha}
                    readOnly
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 font-mono"
                  />
                  <button
                    type="button"
                    onClick={copiarSenha}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                  >
                    {senhaCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {senhaCopied ? 'Copiado!' : 'Copiar'}
                  </button>
                  <button
                    type="button"
                    onClick={gerarSenha}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    🔄
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Cadastrar Usuário
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Usuários Cadastrados ({usuarios.length})
              </h2>
              
              <button
                onClick={carregarUsuarios}
                disabled={loading}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    🔄 Recarregar
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : usuarios.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Nenhum usuário cadastrado ainda
                </div>
              ) : (
                usuarios.map((u) => (
                  <div key={u.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{u.nome}</h3>
                          {u.is_master && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                              <Crown className="w-3 h-3" />
                              Master
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3" />
                          {u.email}
                        </p>
                        <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" />
                          {u.telefone}
                        </p>
                        {u.endereco && (
                          <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {u.endereco}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      Cadastrado em {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}