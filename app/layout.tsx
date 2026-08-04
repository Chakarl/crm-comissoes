'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar' // ← mudou aqui (caminho absoluto)
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)

      if (!session && pathname !== '/login') {
        router.push('/login')
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null)
        if (!session && pathname !== '/login') {
          router.push('/login')
        }
      }
    )

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
            userName={user.email || 'Usuário'} 
            onLogout={handleLogout} 
          />
        )}
        {children}
      </body>
    </html>
  )
}