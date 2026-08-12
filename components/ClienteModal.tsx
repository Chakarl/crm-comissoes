'use client'

import { X, Loader2 } from 'lucide-react'
import {
  CONVENIOS,
  maskCPF,
  maskTelefone,
  type ClienteComData,
  type FormData,
} from '../_hooks/useClientes'

interface Props {
  show: boolean
  editando: ClienteComData | null
  formData: FormData
  setFormData: (fd: FormData) => void
  saving: boolean
  erroForm: string | null
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export function ClienteModal({
  show,
  editando,
  formData,
  setFormData,
  saving,
  erroForm,
  onSubmit,
  onClose,
}: Props) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {editando ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {erroForm && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {erroForm}
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nome completo"
            />
          </div>

          {/* CPF */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CPF *</label>
            <input
              type="text"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
            <input
              type="text"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: maskTelefone(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
          </div>

          {/* Agência e Conta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Agência</label>
              <input
                type="text"
                value={formData.agencia}
                onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Conta</label>
              <input
                type="text"
                value={formData.conta}
                onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="00000-0"
              />
            </div>
          </div>

          {/* Convênio */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Convênio</label>
            <select
              value={formData.convenio}
              onChange={(e) => setFormData({ ...formData, convenio: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Selecione...</option>
              {CONVENIOS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Data Cadastro */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data Cadastro</label>
            <input
              type="date"
              value={formData.data_cadastro}
              onChange={(e) => setFormData({ ...formData, data_cadastro: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editando ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}