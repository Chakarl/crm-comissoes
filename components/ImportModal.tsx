'use client'

import { X, Upload, Loader2, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react'
import { ClienteImportado } from '@/lib/importarClientes'
import { RefObject } from 'react'

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
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDrop: (e: React.DragEvent) => void
  onImportar: () => void
  onClose: () => void
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
  onFileChange,
  onDrop,
  onImportar,
  onClose,
}: Props) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Importar Clientes</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* ── STEP: UPLOAD ── */}
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
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p className="text-lg font-medium text-slate-700 mb-2">
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

              <div className="mt-6 bg-blue-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Formato esperado da planilha:</p>
                    <p>
                      A planilha deve conter colunas com os títulos: <strong>Nome</strong>,{' '}
                      <strong>CPF</strong>, <strong>Telefone</strong> (opcional),{' '}
                      <strong>Agência</strong> (opcional), <strong>Conta</strong> (opcional),{' '}
                      <strong>Data</strong> (opcional).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: PREVIEW ── */}
          {step === 'preview' && (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  {validosCount} válido{validosCount !== 1 && 's'}
                </span>
                {invalidosCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-red-50 text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    {invalidosCount} inválido{invalidosCount !== 1 && 's'}
                  </span>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold text-slate-700">Status</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-700">Nome</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-700">CPF</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-700">Telefone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.map((d, i) => (
                      <tr
                        key={i}
                        className={`border-t border-slate-100 ${
                          !d.valido ? 'bg-red-50/50' : ''
                        }`}
                      >
                        <td className="px-4 py-2">
                          {d.valido ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <span className="text-xs text-red-600" title={d.erro || ''}>
                              <AlertCircle className="w-4 h-4 text-red-500 inline" />{' '}
                              {d.erro}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-700">{d.nome || '—'}</td>
                        <td className="px-4 py-2 text-slate-700">{d.cpf || '—'}</td>
                        <td className="px-4 py-2 text-slate-700">{d.telefone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
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

          {/* ── STEP: RESULTADO ── */}
          {step === 'resultado' && resultado && (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-bold text-slate-900 mb-6">Importação concluída!</h3>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-green-700">{resultado.inseridos}</p>
                  <p className="text-sm text-green-600">Inseridos</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-yellow-700">{resultado.duplicados}</p>
                  <p className="text-sm text-yellow-600">Duplicados</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-red-700">{resultado.erros}</p>
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