import Link from 'next/link'
import { User, FileText, Phone } from 'lucide-react'

interface ClienteCardProps {
  cliente: {
    id: string
    nome: string
    cpf: string | null
    telefone: string | null
    propostas: { count: number }[]
  }
}

export default function ClienteCard({ cliente }: ClienteCardProps) {
  const totalPropostas = cliente.propostas?.[0]?.count || 0

  return (
    <Link href={`/clientes/${cliente.id}`}>
      <div className="bg-white rounded-lg p-5 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                {cliente.nome}
              </h3>
              {cliente.cpf && (
                <p className="text-sm text-slate-500">CPF: {cliente.cpf}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-600 pt-3 border-t border-slate-100">
          {cliente.telefone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-4 h-4" />
              {cliente.telefone}
            </div>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <FileText className="w-4 h-4" />
            {totalPropostas} {totalPropostas === 1 ? 'proposta' : 'propostas'}
          </div>
        </div>
      </div>
    </Link>
  )
}