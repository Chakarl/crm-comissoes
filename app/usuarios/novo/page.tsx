'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useUsuario } from '@/hooks/useUsuario'
import { UserPlus, User, Mail, Phone, MapPin, Lock, Copy, Check, AlertCircle, Loader2, Crown } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!loadingUser) {
      if (!usuario?.is_master) {
        router.push('/dashboard')
      } else {
        carregarUsuarios()
        gerarSenha()
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

  const obterToken = async () => {
    try {
      // Tenta getSession primeiro
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        return session.access_token
      }

      // Se não funcionar, força refresh
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession()
      if (error) throw error
      
      return refreshedSession?.access_token || null
    } catch (error) {
      console.error('Erro ao obter token:', error)
      return null
    }
  }

  const carregarUsuarios = async () => {
    setLoading(true)
    setErro('')

    try {
      const token = await obterToken()

      if (!token) {
        setErro('Sessão expirada. Faça login novamente.')
        setLoading(false)
        return
      }

      const res = await fetch(`/api/usuarios?token=${encodeURIComponent(token)}`)
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.erro || 'Erro ao carregar usuários')
      }

      const data = await res.json()
      setUsuarios(data)
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err)
      setErro(err.message || 'Erro ao carregar lista de usuários')
    } finally {
      setLoading(false)
    }
  }

  const cadastrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (!nome.trim() || !email.trim() || !telefone.trim()) {
      setErro('Preencha nome, email e telefone')
      return
    }

    setSalvando(true)

    try {
      const token = await obterToken()

      if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.')
      }

      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          senha,
          nome: nome.trim(),
          telefone: telefone.trim(),
          endereco: endereco.trim() || null,
          token
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.erro || 'Erro ao cadastrar')
      }

      // Limpa formulário
      setNome('')
      setEmail('')
      setTelefone('')
      setEndereco('')
      gerarSenha()
      setErro('')

      await carregarUsuarios()
     
      // Mostra popup de sucesso
      setShowPopup(true)
      setTimeout(() => setShowPopup(false), 4000)
     
    } catch (err: any) {
      console.error('Erro ao cadastrar:', err)
      setErro(err.message || 'Erro desconhecido ao cadastrar')
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
      {/* Popup de Sucesso */}
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-blue-600" />
            Gerenciar Usuários
          </h1>
          <p className="text-slate-600 mt-2">Cadastre novos corretores no sistema</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário de Cadastro */}
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
                  required
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
                  required
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
                  onChange={(e) => setTelefone(e.target.value)}
                  disabled={salvando}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                  placeholder="(11) 98765-4321"
                  required
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
                  Senha Gerada Automaticamente
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
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    title="Copiar senha"
                  >
                    {senhaCopied ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-slate-600" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={gerarSenha}
                    disabled={salvando}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300"
                  >
                    Gerar Nova
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  A senha será enviada por email para o usuário
                </p>
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
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

          {/* Lista de Usuários */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Usuários Cadastrados ({usuarios.length})
            </h2>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {usuarios.length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  Nenhum usuário cadastrado ainda
                </p>
              ) : (
                usuarios.map((user) => (
                  <div
                    key={user.id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {user.nome}
                        </h3>
                        {user.is_master && (
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            Master
                          </span>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        user.ativo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                      {user.telefone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {user.telefone}
                        </div>
                      )}
                      {user.endereco && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {user.endereco}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-500">
                        Cadastrado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </p>
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