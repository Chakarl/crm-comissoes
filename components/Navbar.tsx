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
import { useState } from 'react'

interface NavbarProps {
  userName: string
  isMaster: boolean
  onLogout: () => void
}

export default function Navbar({ userName, isMaster, onLogout }: NavbarProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/propostas', label: 'Propostas', icon: FileText },
    { href: '/clientes', label: 'Clientes', icon: Users },
    // Master: Cadastrar Usuário | Corretor: Alertas de Renovação
    isMaster
      ? { href: '/usuarios/novo', label: 'Cadastrar Usuário', icon: UserPlus }
      : { href: '/renovacoes', label: 'Alertas de Renovação', icon: Bell },
    { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  ]

  return (
    <nav className="bg-slate-900 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo + links desktop */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl sm:text-2xl font-bold text-white whitespace-nowrap">
              CRM Comissões
            </Link>

            {/* Desktop */}
            <div className="hidden lg:flex gap-2">
              {links.map((link) => {
                const Icon = link.icon
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap
                      ${isActive
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

          {/* User + Minha Conta + logout desktop */}
          <div className="hidden lg:flex items-center gap-3">
            <span className="text-slate-400 text-sm">{userName}</span>
            <Link
              href="/dashboard/minha-conta"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${pathname === '/dashboard/minha-conta'
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
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Menu mobile */}
        {menuOpen && (
          <div className="lg:hidden mt-4 flex flex-col gap-2">
            {links.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
                    ${isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              )
            })}

            {/* Separador + Minha Conta + Sair (mobile) */}
            <div className="border-t border-slate-700 mt-2 pt-3 flex flex-col gap-2 px-4">
              <span className="text-slate-400 text-sm">{userName}</span>
              <Link
                href="/dashboard/minha-conta"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
                  ${pathname === '/dashboard/minha-conta'
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
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm"
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