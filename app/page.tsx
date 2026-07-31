'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import './globals.css'

export default function LoginPage() {
  const [modo, setModo] = useState<'login' | 'registro'>('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [telefone, setTelefone] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha
      })

      if (error) throw error
      router.push('/dashboard')
    } catch (error: any) {
      setErro(error.message === 'Invalid login credentials' 
        ? 'Email ou senha incorretos' 
        : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setLoading(true)

    // Validações
    if (!nomeCompleto.trim()) {
      setErro('Digite seu nome completo')
      setLoading(false)
      return
    }

    if (!telefone.trim()) {
      setErro('Digite seu telefone')
      setLoading(false)
      return
    }

    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres')
      setLoading(false)
      return
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem')
      setLoading(false)
      return
    }

    try {
      // 1. Criar conta
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            nome_completo: nomeCompleto.trim(),
            telefone: telefone.trim()
          }
        }
      })

      if (signUpError) throw signUpError

      // 2. Criar perfil manualmente (caso o trigger não funcione)
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            nome_completo: nomeCompleto.trim(),
            telefone: telefone.trim()
          })

        if (profileError && profileError.code !== '23505') {
          console.error('Erro ao criar perfil:', profileError)
        }
      }

      alert('✅ Conta criada com sucesso! Faça login para continuar.')
      setModo('login')
      setNomeCompleto('')
      setTelefone('')
      setSenha('')
      setConfirmarSenha('')
    } catch (error: any) {
      setErro(error.message === 'User already registered' 
        ? 'Este email já está cadastrado' 
        : 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  // Formatar telefone automaticamente
  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    
    if (numeros.length <= 10) {
      return numeros
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
    } else {
      return numeros
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .slice(0, 15)
    }
  }

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarTelefone(e.target.value)
    setTelefone(valorFormatado)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: '440px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>💰</div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', color: '#111827' }}>
            CRM Comissões
          </h1>
          <p style={{ color: '#6b7280', fontSize: '15px' }}>
            {modo === 'login' ? 'Acesse sua conta' : 'Crie sua conta gratuitamente'}
          </p>
        </div>

        <form onSubmit={modo === 'login' ? handleLogin : handleRegistro}>
          {modo === 'registro' && (
            <>
              {/* NOME COMPLETO */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 600, 
                  color: '#374151',
                  fontSize: '14px'
                }}>
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={nomeCompleto}
                  onChange={(e) => setNomeCompleto(e.target.value)}
                  placeholder="Ex: João da Silva"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* TELEFONE */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 600, 
                  color: '#374151',
                  fontSize: '14px'
                }}>
                  Telefone
                </label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={handleTelefoneChange}
                  placeholder="(11) 99999-9999"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </>
          )}

          {/* EMAIL */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 600, 
              color: '#374151',
              fontSize: '14px'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* SENHA */}
          <div style={{ marginBottom: modo === 'registro' ? '20px' : '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 600, 
              color: '#374151',
              fontSize: '14px'
            }}>
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
            {modo === 'registro' && (
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                Mínimo de 6 caracteres
              </p>
            )}
          </div>

          {/* CONFIRMAR SENHA (apenas no registro) */}
          {modo === 'registro' && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 600, 
                color: '#374151',
                fontSize: '14px'
              }}>
                Confirmar Senha
              </label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          )}

          {/* MENSAGEM DE ERRO */}
          {erro && (
            <div style={{
              padding: '12px',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              {erro}
            </div>
          )}

          {/* BOTÃO DE SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s, opacity 0.2s'
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {loading ? 'Aguarde...' : (modo === 'login' ? 'Entrar' : 'Criar Conta')}
          </button>
        </form>

        {/* ALTERNAR ENTRE LOGIN E REGISTRO */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            {modo === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}
            {' '}
            <button
              onClick={() => {
                setModo(modo === 'login' ? 'registro' : 'login')
                setErro('')
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {modo === 'login' ? 'Cadastre-se' : 'Faça login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}