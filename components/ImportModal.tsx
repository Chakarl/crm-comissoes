'use client'

import { RefObject } from 'react'
import {
  X,
  Loader2,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import { ClienteImportado } from '@/lib/importarClientes'

interface Props {
  show: boolean
  step: 'upload' | 'preview' | 'resultado'
  dados: ClienteImportado[]
  importando: boolean
  resultado: { inseridos: number; duplicados: number; erros: number } | null
  dragOver: boolean
  setDragOver: (v: boolean) => void
  fileInputRef: RefObject<HTMLInputElement>
  validosCount: number
  invalidosCount: number
  onClose: () => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDrop: (e: React.DragEvent) => void
  onImportar: () => void
}

export function ImportModal({
  show,
  step,
  dados,
  importando,
  resultado,
  dragOver,
  setDragOver,
  fileInputRef,
  validosCount,
  invalidosCount,
  onClose,
  onFileChange,
  onDrop,
  onImportar,
}: Props) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Importar Planilha
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          {/* ── STEP: Upload ── */}
          {step === 'upload' && (
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
                }`}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p className="text-lg font-medium text-slate-700 mb-1">
                  Arraste o arquivo aqui ou clique para selecionar
                </p>
                <p className="text-sm text-slate-500">
                  Formatos aceitos: .xlsx, .xls, .csv, .xml
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.xml"
                onChange={onFileChange}
                className="hidden"
              />

              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  📋 Formato esperado da planilha:
                </p>
                <p className="text-sm text-blue-700">
                  Colunas: <strong>Nome</strong>, <strong>CPF</strong>,{' '}
                  <strong>Telefone</strong>, <strong>Agência</strong>,{' '}
                  <strong>Conta</strong>, <strong>Data Cadastro</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  * Nome e CPF são obrigatórios. Os demais campos são opcionais.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP: Preview ── */}
          {step === 'preview' && (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  {validosCount} válidos
                </span>
                {invalidosCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-red-50 text-red-700">
                    <XCircle className="w-4 h-4" />
                    {invalidosCount} inválidos
                  </span>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">
                        Status
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">
                        Nome
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">
                        CPF
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">
                        Erro
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.map((d, i) => (
                      <tr
                        key={i}
                        className={`border-t ${
                          d.valido ? '' : 'bg-red-50'
                        }`}
                      >
                        <td className="px-3 py-2">
                          {d.valido ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-800">
                          {d.nome || '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {d.cpf || '—'}
                        </td>
                        <td className="px-3 py-2 text-red-600 text-xs">
                          {d.erro || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={onImportar}
                  disabled={importando || validosCount === 0}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Importar {validosCount} cliente{validosCount !== 1 && 's'}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: Resultado ── */}
          {step === 'resultado' && resultado && (
            <div className="text-center py-4">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
              <h3 className="text-xl font-bold text-slate-900 mb-6">
                Importação concluída!
              </h3>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-emerald-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-emerald-700">
                    {resultado.inseridos}
                  </p>
                  <p className="text-sm text-emerald-600">Inseridos</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-amber-700">
                    {resultado.duplicados}
                  </p>
                  <p className="text-sm text-amber-600">Duplicados</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-red-700">
                    {resultado.erros}
                  </p>
                  <p className="text-sm text-red-600">Erros</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}