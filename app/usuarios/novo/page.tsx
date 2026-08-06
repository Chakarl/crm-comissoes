'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useUsuario } from '@/hooks/useUsuario'
import { UserPlus, User, Mail, Phone, MapPin, Lock, Copy, Check, AlertCircle, Loader2, Crown, Trash2 } from 'lucide-react'
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

  // Máscara de telefone brasileira
  const formatarTelefone = (valor: string) => {
    const numero = valor.replace(/\D/g, '')
    
    if (numero.length === 0) return ''
    if (numero.length <= 2) return `(${numero}`
    if (numero.length <= 6) return `(${numero.slice(0, 2)}) ${numero.slice(2)}`
    if (numero.length <= 10) return `(${numero.slice(0, 2)}) ${numero.slice(2, 6)}-${numero.slice(6)}`
    
    return `(${numero.slice(0, 2)}) ${numero.slice(2, 7)}-${numero.slice(7, 11)}`
  }

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarTelefone(e.target.value)
    setTelefone(formatted)
  }

  const obterToken = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        return session.access_token
      }

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
        throw new Error(data.erro || `Erro ${res.status}`)
      }

      // Limpa formulário
      setNome('')
      setEmail('')
      setTelefone('')
      setEndereco('')
      gerarSenha()
      setErro('')

      await carregarUsuarios()
     
      // Popup de sucesso
      setShowPopup(true)
      setTimeout(() => setShowPopup(false), 4000)
     
    } catch (err: any) {
      console.error('Erro ao cadastrar:', err)
      setErro(err.message || 'Erro desconhecido')
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
            <p className="font-semibold">✅ Usuário cadastrado!</p>
            <p className="text-sm opacity-90">Email enviado com credenciais</p>
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
          {/* Formulário */}
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
                  placeholder="email@exemplo.com"
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
                  onChange={handleTelefoneChange}
                  disabled={salvando}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Endereço (opcional)
                </label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  disabled={salvando}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                  placeholder="Rua, número, bairro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Senha Gerada
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={senha}
                    readOnly
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={copiarSenha}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Copiar senha"
                  >
                    {senhaCopied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-600" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={gerarSenha}
                    disabled={salvando}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    Nova
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:bg-blue-300 flex items-center justify-center gap-2"
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
              <User className="w-5 h-5 text-slate-600" />
              Usuários Cadastrados ({usuarios.length})
            </h2>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {usuarios.map((u) => (
                <div
                  key={u.id}
                  className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900">{u.nome}</p>
                        {u.is_master && (
                          <Crown className="w-4 h-4 text-yellow-500" title="Master" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {u.email}
                      </p>
                      <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        {u.telefone}
                      </p>
                      {u.endereco && (
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {u.endereco}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {usuarios.length === 0 && !loading && (
                <div className="text-center py-12 text-slate-500">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum usuário cadastrado ainda</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}