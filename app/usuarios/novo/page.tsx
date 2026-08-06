'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useUsuario } from '@/hooks/useUsuario'
import { UserPlus, Crown, User, Mail, Lock, AlertCircle, Phone, MapPin, Copy, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function UsuariosPage() {
  const { usuario, loading: loadingUser } = useUsuario()
  const router = useRouter()
  const supabase = createClient()

  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [senha, setSenha] = useState('')
  const [senhaCopied, setSenhaCopied] = useState(false)
  const [erro, setErro] = useState('')

  // Modal de sucesso
  const [mostrarSucesso, setMostrarSucesso] = useState(false)
  const [dadosCadastrados, setDadosCadastrados] = useState({ email: '', senha: '' })

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

  const carregarUsuarios = async () => {
    setLoading(true)
    
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      setLoading(false)
      return
    }

    const res = await fetch(`/api/usuarios?token=${token}`)
    const data = await res.json()
    
    if (res.ok) {
      setUsuarios(data)
    }
    
    setLoading(false)
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
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) throw new Error('Sessão inválida')

      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          senha, 
          nome,
          telefone,
          endereco: endereco.trim() || null,
          token 
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.erro || 'Erro ao cadastrar')
      }

      // Salva dados para o modal
      setDadosCadastrados({ email, senha })

      // Limpa form e gera nova senha
      setNome('')
      setEmail('')
      setTelefone('')
      setEndereco('')
      gerarSenha()

      await carregarUsuarios()

      // Mostra modal de sucesso
      setMostrarSucesso(true)

    } catch (err: any) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  if (loadingUser || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Carregando...</div>
      </div>
    )
  }

  if (!usuario?.is_master) return null

  return (
    <>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-blue-600" />
              Gerenciar Usuários
            </h1>
            <p className="text-slate-600 mt-2">Cadastre novos corretores</p>
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
                    <span className="text-sm">{erro}</span>
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
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="(11) 98765-4321"
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
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Rua, número, bairro, cidade"
                  />
                </div>

                {/* Senha Gerada */}
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
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 font-mono text-lg tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={copiarSenha}
                      className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
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
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Gerar Nova
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={salvando}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {salvando ? 'Cadastrando...' : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Cadastrar Usuário
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Lista */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Usuários Cadastrados</h2>
              
              <div className="space-y-3">
                {usuarios.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">Nenhum usuário cadastrado ainda</p>
                ) : (
                  usuarios.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        {u.is_master ? (
                          <Crown className="w-5 h-5 text-amber-500" />
                        ) : (
                          <User className="w-5 h-5 text-slate-400" />
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{u.nome}</p>
                          <p className="text-sm text-slate-500">{u.email}</p>
                          {u.telefone && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                              <Phone className="w-3 h-3" />
                              {u.telefone}
                            </p>
                          )}
                        </div>
                      </div>
                      {u.is_master && (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          MASTER
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Sucesso */}
      {mostrarSucesso && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setMostrarSucesso(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                Usuário Cadastrado com Sucesso!
              </h3>

              <p className="text-slate-600 mb-6">
                Um email foi enviado com os dados de acesso.
              </p>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6 text-left">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider mb-1">
                      📧 Email
                    </p>
                    <p className="text-sm font-medium text-blue-700">
                      {dadosCadastrados.email}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider mb-1">
                      🔑 Senha
                    </p>
                    <p className="text-lg font-bold font-mono text-blue-700 bg-blue-100 px-3 py-2 rounded tracking-wider">
                      {dadosCadastrados.senha}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Importante:</strong> O usuário receberá esses dados por email, mas você pode anotar para referência.
                  </span>
                </p>
              </div>

              <button
                onClick={() => setMostrarSucesso(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}