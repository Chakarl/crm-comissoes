'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [isMaster, setIsMaster] = useState(false)
  const [userRole, setUserRole] = useState<string>('promotor')
  const [loading, setLoading] = useState(true)

  const carregarDadosUsuario = async (userId: string, email?: string) => {
    const { data: userData } = await supabase
      .from('usuarios')
      .select('nome, is_master, role')
      .eq('id', userId)
      .single()

    setIsMaster(userData?.is_master || false)
    setUserRole(userData?.role || 'promotor')
    setNomeUsuario(userData?.nome || email || 'Usuário')
  }

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setUser(session?.user || null)

      if (session?.user) {
        await carregarDadosUsuario(session.user.id, session.user.email)
      }

      setLoading(false)

      if (!session && pathname !== '/login') {
        router.push('/login')
      }
    }

    checkUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null)

      if (session?.user) {
        await carregarDadosUsuario(session.user.id, session.user.email)
      } else {
        setIsMaster(false)
        setUserRole('promotor')
        setNomeUsuario('')
      }

      if (!session && pathname !== '/login') {
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router, pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <html lang="pt-BR">
        <body className="bg-slate-50">
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-slate-600">Carregando...</div>
          </div>
        </body>
      </html>
    )
  }

  const isLoginPage = pathname === '/login'

  return (
    <html lang="pt-BR">
      <body className="bg-slate-50">
        {!isLoginPage && user && (
          <Navbar
            userName={nomeUsuario}
            isMaster={isMaster}
            userRole={userRole}
            onLogout={handleLogout}
          />
        )}
        {children}
      </body>
    </html>
  )
}