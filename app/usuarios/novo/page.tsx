'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useUsuario } from '@/hooks/useUsuario'
import { UserPlus, User, Mail, Phone, MapPin, Lock, Copy, Check, AlertCircle, Loader2, Crown, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
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

  const formatarTelefone = (valor: string) => {
    const numero = valor.replace(/\D/g, '')
    
    if (numero.length <= 10) {
      return numero
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
    }
    
    return numero
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15)
  }

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(formatarTelefone(e.target.value))
  }

  const obterToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Sessão expirada')
    return session.access_token
  }

  const carregarUsuarios = async () => {
    try {
      setLoading(true)
      const token = await obterToken()
      
      const res = await fetch(`/api/usuarios?token=${encodeURIComponent(token)}`)
      
      if (!res.ok) {
        throw new Error('Erro ao carregar usuários')
      }

      const data = await res.json()
      setUsuarios(data)
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error)
      setErro(error.message)
    } finally {
      setLoading(false)
    }
  }

  const alternarAtivo = async (userId: string, statusAtual: boolean) => {
    try {
      setErro('')
      const token = await obterToken()
      
      const res = await fetch('/api/usuarios/toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: userId, 
          ativo: !statusAtual,
          token 
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.erro || 'Erro ao alterar status')
      }

      setUsuarios(prev => 
        prev.map(u => 
          u.id === userId 
            ? { ...u, ativo: !statusAtual } 
            : u
        )
      )

      console.log('✅', data.mensagem)

    } catch (error: any) {
      console.error('Erro ao alterar status:', error)
      setErro(error.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nome.trim() || !email.trim() || !telefone.trim() || !senha.trim()) {
      setErro('Preencha todos os campos obrigatórios')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setErro('E-mail inválido')
      return
    }

    const telefoneNumeros = telefone.replace(/\D/g, '')
    if (telefoneNumeros.length < 10) {
      setErro('Telefone inválido')
      return
    }

    try {
      setSalvando(true)
      setErro('')

      const token = await obterToken()

      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          telefone: telefoneNumeros,
          endereco: endereco.trim() || null,
          senha,
          token
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.erro || 'Erro ao cadastrar usuário')
      }

      setShowPopup(true)
      
      setNome('')
      setEmail('')
      setTelefone('')
      setEndereco('')
      gerarSenha()
      
      await carregarUsuarios()

      setTimeout(() => setShowPopup(false), 5000)

    } catch (error: any) {
      console.error('Erro ao cadastrar:', error)
      setErro(error.message)
    } finally {
      setSalvando(false)
    }
  }

  if (loadingUser || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-blue-600" />
            Cadastrar Novo Usuário
          </h1>
          <p className="text-slate-600 mt-2">
            Crie credenciais de acesso para novos usuários do sistema
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Formulário */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Dados do Usuário
            </h2>

            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2 mb-6">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{erro}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Digite o nome completo"
                  disabled={salvando}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  E-mail *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="email@exemplo.com"
                    disabled={salvando}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Telefone *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    value={telefone}
                    onChange={handleTelefoneChange}
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="(11) 98765-4321"
                    disabled={salvando}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Endereço
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <textarea
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Rua, número, bairro, cidade"
                    rows={2}
                    disabled={salvando}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Senha Gerada *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={senha}
                      readOnly
                      className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={copiarSenha}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {senhaCopied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="text-sm font-medium">Copiar</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={gerarSenha}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Nova
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  A senha será enviada por e-mail automaticamente
                </p>
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              <Crown className="w-5 h-5 text-amber-500" />
              Usuários Cadastrados ({usuarios.length})
            </h2>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {usuarios.map((u) => (
                <div
                  key={u.id}
                  className={`p-4 rounded-lg border transition-all ${
                    u.ativo
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-50 border-slate-300 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="font-medium text-slate-900 truncate">{u.nome}</p>
                        {u.is_master && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
                            MASTER
                          </span>
                        )}
                        {!u.ativo && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                            INATIVO
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm text-slate-600">
                        <p className="flex items-center gap-2">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{u.email}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          {u.telefone}
                        </p>
                        {u.endereco && (
                          <p className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span className="break-words">{u.endereco}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Botão de toggle - só aparece se não for master nem o próprio usuário */}
                    {!u.is_master && u.id !== usuario?.id && (
                      <button
                        onClick={() => alternarAtivo(u.id, u.ativo)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          u.ativo
                            ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                            : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                        }`}
                        title={u.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                      >
                        {u.ativo ? (
                          <>
                            <ToggleRight className="w-5 h-5" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-5 h-5" />
                            Ativar
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Popup de Sucesso */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">
                Usuário Cadastrado!
              </h3>
              <p className="text-slate-600">
                As credenciais foram enviadas por e-mail para <strong>{email}</strong>
              </p>
              <button
                onClick={() => setShowPopup(false)}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}