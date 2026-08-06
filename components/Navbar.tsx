'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Users,
  Bell,
  UserPlus,
  BarChart3,
  LogOut,
  Menu,
  X,
  UserCog,
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface NavbarProps {
  userName: string
  isMaster: boolean
  onLogout: () => void
}

function getSaudacao(): string {
  const hora = new Date().getHours()
  if (hora >= 1 && hora < 5) return 'Boa madrugada'
  if (hora >= 5 && hora < 13) return 'Bom dia'
  if (hora >= 13 && hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getPrimeiroNome(nome: string): string {
  if (!nome) return ''
  // Se for e-mail, pega antes do @
  const base = nome.includes('@') ? nome.split('@')[0] : nome
  // Pega só o primeiro nome e capitaliza
  const primeiro = base.split(/[\s._-]/)[0]
  return primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase()
}

export default function Navbar({ userName, isMaster, onLogout }: NavbarProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [saudacao, setSaudacao] = useState(getSaudacao())

  // Atualiza a saudação a cada minuto
  useEffect(() => {
    const interval = setInterval(() => setSaudacao(getSaudacao()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const primeiroNome = getPrimeiroNome(userName)

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/propostas', label: 'Propostas', icon: FileText },
    { href: '/clientes', label: 'Clientes', icon: Users },
    isMaster
      ? { href: '/usuarios/novo', label: 'Cadastrar Usuário', icon: UserPlus }
      : { href: '/renovacoes', label: 'Alertas de Renovação', icon: Bell },
    { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  ]

  return (
    <nav className="bg-slate-900 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Esquerda: Logo + Saudação + Links desktop */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-xl sm:text-2xl font-bold text-white whitespace-nowrap"
              >
                CRM Comissões
              </Link>

              {/* Saudação desktop */}
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-slate-400 border-l border-slate-700 pl-4">
                <span>{saudacao},</span>
                <span className="text-white font-medium">{primeiroNome}</span>
                <span className="text-lg">👋</span>
              </div>
            </div>

            {/* Links desktop */}
            <div className="hidden lg:flex gap-2">
              {links.map((link) => {
                const Icon = link.icon
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap
                      ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Direita: Minha Conta + Sair (desktop) */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/dashboard/minha-conta"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  pathname === '/dashboard/minha-conta'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <UserCog className="w-4 h-4" />
              Minha Conta
            </Link>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>

          {/* Hamburguer mobile */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden text-slate-300 hover:text-white"
          >
            {menuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Menu mobile */}
        {menuOpen && (
          <div className="lg:hidden mt-4 flex flex-col gap-2">
            {/* Saudação mobile */}
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400 border-b border-slate-700 mb-1">
              <span>{saudacao},</span>
              <span className="text-white font-medium">{primeiroNome}</span>
              <span className="text-lg">👋</span>
            </div>

            {links.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
                    ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              )
            })}

            {/* Minha Conta + Sair (mobile) */}
            <div className="border-t border-slate-700 mt-2 pt-3 flex flex-col gap-2">
              <Link
                href="/dashboard/minha-conta"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
                  ${
                    pathname === '/dashboard/minha-conta'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <UserCog className="w-5 h-5" />
                Minha Conta
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onLogout()
                }}
                className="flex items-center justify-center gap-2 mx-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}