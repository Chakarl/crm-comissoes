'use client'

import { X, Loader2, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { ClienteImportado } from '@/lib/importarClientes'

interface Props {
  show: boolean
  step: 'upload' | 'preview' | 'resultado'
  dados: ClienteImportado[]
  importando: boolean
  resultado: { inseridos: number; duplicados: number; erros: number } | null
  dragOver: boolean
  setDragOver: (v: boolean) => void
  fileInputRef: React.RefObject<HTMLInputElement>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Importar Planilha
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* ── UPLOAD ── */}
          {step === 'upload' && (
            <div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
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
                  Formatos: .xlsx, .xls, .csv, .xml
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.xml"
                onChange={onFileChange}
                className="hidden"
              />

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  📋 Colunas esperadas na planilha:
                </p>
                <p className="text-sm text-blue-700">
                  <strong>nome</strong> (obrigatório), <strong>cpf</strong> (obrigatório),
                  telefone, agencia, conta, data_cadastro
                </p>
              </div>
            </div>
          )}

          {/* ── PREVIEW ── */}
          {step === 'preview' && (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className="flex items-center gap-1 text-sm text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-4 h-4" />
                  {validosCount} válidos
                </span>
                {invalidosCount > 0 && (
                  <span className="flex items-center gap-1 text-sm text-red-700 bg-red-50 px-3 py-1 rounded-full">
                    <XCircle className="w-4 h-4" />
                    {invalidosCount} inválidos
                  </span>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Nome</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">CPF</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Telefone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.map((d, i) => (
                      <tr
                        key={i}
                        className={`border-t border-slate-100 ${!d.valido ? 'bg-red-50/50' : ''}`}
                      >
                        <td className="px-3 py-2">
                          {d.valido ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <span title={d.erro}>
                              <XCircle className="w-4 h-4 text-red-500" />
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{d.nome || '—'}</td>
                        <td className="px-3 py-2 text-slate-700">{d.cpf || '—'}</td>
                        <td className="px-3 py-2 text-slate-700">{d.telefone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={onImportar}
                  disabled={importando || validosCount === 0}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Importar {validosCount} cliente{validosCount !== 1 && 's'}
                </button>
              </div>
            </div>
          )}

          {/* ── RESULTADO ── */}
          {step === 'resultado' && resultado && (
            <div className="text-center py-6">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
              <h3 className="text-xl font-bold text-slate-900 mb-4">Importação Concluída</h3>

              <div className="flex justify-center gap-6 mb-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{resultado.inseridos}</p>
                  <p className="text-sm text-slate-500">Inseridos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">{resultado.duplicados}</p>
                  <p className="text-sm text-slate-500">Duplicados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{resultado.erros}</p>
                  <p className="text-sm text-slate-500">Erros</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-2.5 rounded-lg font-medium"
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