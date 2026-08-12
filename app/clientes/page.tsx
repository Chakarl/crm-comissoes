'use client'

import {
  Plus,
  Search,
  Users as UsersIcon,
  Pencil,
  Trash2,
  X,
  Loader2,
  Upload,
  CalendarDays,
} from 'lucide-react'
import { Paginacao } from '@/components/Paginacao'
import { FiltroMes } from '@/components/FiltroMes'
import {
  useClientes,
  CONVENIOS,
  formatarTelefoneExibicao,
} from '@/hooks/useClientes'
import { ClienteModal } from '@/components/ClienteModal'
import { ImportModal } from '@/components/ImportModal'

export default function ClientesPage() {
  const ctx = useClientes()

  if (ctx.loadingUser || ctx.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Carregando clientes...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">
              Clientes
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              {ctx.filtered.length} cliente{ctx.filtered.length !== 1 && 's'}
              {ctx.search && ` encontrado${ctx.filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={ctx.abrirImport}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base flex-1 sm:flex-none justify-center"
            >
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              Importar Planilha
            </button>
            <button
              onClick={ctx.abrirNovo}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base flex-1 sm:flex-none justify-center"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Novo Cliente
            </button>
          </div>
        </div>

        {/* Filtro por Promotor (master only) */}
        {ctx.usuario?.is_master && (
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <UsersIcon className="w-4 h-4 text-violet-500" />
              <span className="font-medium">Promotor:</span>
            </div>
            <select
              value={ctx.promotorFiltro}
              onChange={(e) => {
                ctx.setPromotorFiltro(e.target.value)
                ctx.setPagina(1)
              }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todos os Promotores</option>
              {ctx.listaPromotores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Busca */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou CPF..."
              value={ctx.search}
              onChange={(e) => ctx.setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Filtro por Mês */}
        <FiltroMes
          mesSelecionado={ctx.mesFiltro}
          onSelecionar={ctx.setMesFiltro}
          datasDisponiveis={ctx.datasDisponiveis}
        />

        {/* Filtro Convênio + Período (mesma linha) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-8">
            {/* Convênio */}
            <div className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-slate-600">Convênio:</span>
              <select
                value={ctx.convenioFiltro}
                onChange={(e) => ctx.setConvenioFiltro(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos</option>
                {CONVENIOS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Período */}
            <div className="flex items-center gap-2 flex-wrap">
              <CalendarDays className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-slate-600">Período:</span>
              <input
                type="date"
                value={ctx.dataInicio}
                onChange={(e) => ctx.setDataInicio(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm text-slate-400">até</span>
              <input
                type="date"
                value={ctx.dataFim}
                onChange={(e) => ctx.setDataFim(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {(ctx.dataInicio || ctx.dataFim) && (
                <button
                  onClick={() => {
                    ctx.setDataInicio('')
                    ctx.setDataFim('')
                  }}
                  className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Data</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Nome</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">CPF</th>
                {ctx.usuario?.is_master && ctx.promotorFiltro === 'todos' && (
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Promotor</th>
                )}
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Convênio</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Agência</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Conta</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Telefone</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ctx.fatia.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-700">
                    {c.data_cadastro
                      ? new Date(c.data_cadastro + 'T00:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{c.nome}</td>
                  <td className="px-6 py-4 text-slate-700">{c.cpf || '—'}</td>
                  {ctx.usuario?.is_master && ctx.promotorFiltro === 'todos' && (
                    <td className="px-6 py-4 text-slate-700">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                        {(c.usuario_id && ctx.nomePromotorMap[c.usuario_id]) || '—'}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 text-slate-700">
                    {c.convenio ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        {c.convenio}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-700">{c.agencia || '—'}</td>
                  <td className="px-6 py-4 text-slate-700">{c.conta || '—'}</td>
                  <td className="px-6 py-4 text-slate-700">{formatarTelefoneExibicao(c.telefone)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => ctx.abrirEditar(c)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir o cliente "${c.nome}"?`)) ctx.handleDelete(c.id)
                        }}
                        disabled={ctx.deletando === c.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Excluir"
                      >
                        {ctx.deletando === c.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {ctx.fatia.length === 0 && (
                <tr>
                  <td
                    colSpan={ctx.usuario?.is_master && ctx.promotorFiltro === 'todos' ? 10 : 9}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    <UsersIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">Nenhum cliente encontrado</p>
                    <p className="text-sm mt-1">Ajuste os filtros ou cadastre um novo cliente.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3">
          {ctx.fatia.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{c.nome}</h3>
                  <p className="text-sm text-slate-500">{c.cpf || 'Sem CPF'}</p>
                  {ctx.usuario?.is_master && ctx.promotorFiltro === 'todos' && (
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                      {(c.usuario_id && ctx.nomePromotorMap[c.usuario_id]) || '—'}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => ctx.abrirEditar(c)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir "${c.nome}"?`)) ctx.handleDelete(c.id)
                    }}
                    disabled={ctx.deletando === c.id}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  >
                    {ctx.deletando === c.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-500">Data:</span>{' '}
                  <span className="text-slate-700">
                    {c.data_cadastro
                      ? new Date(c.data_cadastro + 'T00:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Convênio:</span>{' '}
                  <span className="text-slate-700">{c.convenio || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Agência:</span>{' '}
                  <span className="text-slate-700">{c.agencia || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Conta:</span>{' '}
                  <span className="text-slate-700">{c.conta || '—'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Telefone:</span>{' '}
                  <span className="text-slate-700">{formatarTelefoneExibicao(c.telefone)}</span>
                </div>
              </div>
            </div>
          ))}
          {ctx.fatia.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
              <UsersIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">Nenhum cliente encontrado</p>
            </div>
          )}
        </div>

        {/* Paginação */}
        {ctx.totalPaginas > 1 && (
          <div className="mt-6">
            <Paginacao
              paginaAtual={ctx.pag}
              totalPaginas={ctx.totalPaginas}
              onMudarPagina={ctx.setPagina}
            />
          </div>
        )}
      </div>

      {/* Modais */}
      <ClienteModal
        show={ctx.showModal}
        editando={ctx.editando}
        formData={ctx.formData}
        setFormData={ctx.setFormData}
        saving={ctx.saving}
        erroForm={ctx.erroForm}
        onSubmit={ctx.handleSubmit}
        onClose={ctx.fecharModal}
      />

      <ImportModal
        show={ctx.showImportModal}
        step={ctx.importStep}
        dados={ctx.importDados}
        importando={ctx.importando}
        resultado={ctx.importResultado}
        dragOver={ctx.dragOver}
        setDragOver={ctx.setDragOver}
        fileInputRef={ctx.fileInputRef}
        validosCount={ctx.validosCount}
        invalidosCount={ctx.invalidosCountPreview}
        onFileChange={ctx.onFileChange}
        onDrop={ctx.onDrop}
        onImportar={ctx.handleImportar}
        onClose={ctx.fecharImport}
      />
    </div>
  )
}