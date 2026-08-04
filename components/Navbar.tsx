'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Bell, 
  LogOut 
} from 'lucide-react'

interface NavbarProps {
  userName: string
  onLogout: () => void
}

export default function Navbar({ userName, onLogout }: NavbarProps) {
  const pathname = usePathname()

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/propostas', label: 'Propostas', icon: FileText },
    { href: '/clientes', label: 'Clientes', icon: Users },
    { href: '/renovacoes', label: 'Alertas de Renovação', icon: Bell },
  ]

  return (
    <nav className="bg-slate-900 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-2xl font-bold text-white">
              CRM Comissões
            </Link>
            
            <div className="flex gap-2">
              {links.map((link) => {
                const Icon = link.icon
                const isActive = pathname === link.href
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                      ${isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">
              {userName}
            </span>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}