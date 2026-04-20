"use client";

import { useState } from "react";
import { TipoDocumentoFiscal, StatusProcessamentoFiscal, StatusObrigacaoFiscal } from "@prisma/client";
import { api } from "@/lib/api";

export type DocumentoDetalhe = {
  id: string;
  tipoDocumento: TipoDocumentoFiscal;
  nomeArquivo: string;
  arquivoUrl: string;
  tamanhoBytes: number;
  statusProcessamento: StatusProcessamentoFiscal;
  competencia: string | null;
  vencimento: string | null;
  valorTotal: string | null;
  numeroDocumento: string | null;
  dadosExtraidos: Record<string, unknown> | null;
  erroProcessamento: string | null;
  createdAt: string;
  empresaFiscal: { cnpj: string; razaoSocial: string };
  obrigacao: {
    id: string;
    tipo: string;
    status: StatusObrigacaoFiscal;
    vencimento: string;
    valorTotal: string | null;
  } | null;
};

const TIPOS: TipoDocumentoFiscal[] = [
  "DAS", "DARF_MAED", "PGDAS_D_RECIBO", "DEFIS_RECIBO",
  "NOTIFICACAO_MAED", "RELATORIO_SITUACAO", "OUTROS",
];

const TIPO_LABEL: Record<TipoDocumentoFiscal, string> = {
  DAS: "DAS",
  DARF_MAED: "DARF MAED",
  PGDAS_D_RECIBO: "PGDAS-D Recibo",
  DEFIS_RECIBO: "DEFIS Recibo",
  NOTIFICACAO_MAED: "Notificação MAED",
  RELATORIO_SITUACAO: "Relatório de Situação",
  OUTROS: "Outros",
};

function toInputDate(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function toInputMonth(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatBrl(valor: string | null): string {
  if (!valor) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(valor));
}

type Props = {
  documento: DocumentoDetalhe | null;
  onClose: () => void;
  onExcluir: (id: string) => void;
  onReprocessar: (id: string, modo: "SEMI_AUTO" | "IA") => void;
  onAtualizado: (doc: DocumentoDetalhe) => void;
};

export function DocumentoDrawer({ documento, onClose, onExcluir, onReprocessar, onAtualizado }: Props) {
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [modoReprocessar, setModoReprocessar] = useState(false);
  const [form, setForm] = useState<{
    tipoDocumento: TipoDocumentoFiscal;
    competencia: string;
    vencimento: string;
    valorTotal: string;
    numeroDocumento: string;
  } | null>(null);

  function abrirEdicao() {
    if (!documento) return;
    setForm({
      tipoDocumento: documento.tipoDocumento,
      competencia: toInputMonth(documento.competencia),
      vencimento: toInputDate(documento.vencimento),
      valorTotal: documento.valorTotal ? parseFloat(documento.valorTotal).toFixed(2) : "",
      numeroDocumento: documento.numeroDocumento ?? "",
    });
    setErro("");
    setEditando(true);
  }

  function cancelarEdicao() {
    setEditando(false);
    setForm(null);
    setErro("");
  }

  async function salvar() {
    if (!documento || !form) return;
    setSalvando(true);
    setErro("");

    const body: Record<string, unknown> = {
      tipoDocumento: form.tipoDocumento,
      statusProcessamento: "MANUAL",
    };
    if (form.competencia) body.competencia = `${form.competencia}-01`;
    if (form.vencimento) body.vencimento = form.vencimento;
    if (form.valorTotal) body.valorTotal = parseFloat(form.valorTotal.replace(",", "."));
    if (form.numeroDocumento) body.numeroDocumento = form.numeroDocumento;

    const { data, status } = await api<DocumentoDetalhe>(`/documentos-fiscais/${documento.id}`, {
      method: "PATCH",
      body,
    });

    setSalvando(false);

    if (status === 200 && data) {
      onAtualizado(data);
      setEditando(false);
      setForm(null);
    } else {
      setErro("Não foi possível salvar as alterações.");
    }
  }

  if (!documento) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 h-full w-full max-w-md bg-theme-card border-l border-theme z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-theme">
          <h2 className="font-heading font-semibold text-theme-primary truncate pr-4">
            {documento.nomeArquivo}
          </h2>
          <button type="button" className="text-theme-muted hover:text-theme shrink-0" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {/* Empresa */}
          <div>
            <p className="text-xs text-theme-muted mb-1">Empresa</p>
            <p className="text-sm font-mono">{documento.empresaFiscal.cnpj}</p>
            <p className="text-sm">{documento.empresaFiscal.razaoSocial}</p>
          </div>

          {/* Metadados — modo leitura */}
          {!editando && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-theme-muted">Tipo</p>
                <p className="text-sm font-medium">{TIPO_LABEL[documento.tipoDocumento]}</p>
              </div>
              <div>
                <p className="text-xs text-theme-muted">Status</p>
                <p className="text-sm font-medium">{documento.statusProcessamento.replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-xs text-theme-muted">Competência</p>
                <p className="text-sm font-mono">
                  {documento.competencia
                    ? (() => { const d = new Date(documento.competencia); return `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`; })()
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-muted">Vencimento</p>
                <p className="text-sm font-mono">
                  {documento.vencimento ? new Date(documento.vencimento).toLocaleDateString("pt-BR") : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-muted">Valor</p>
                <p className="text-sm font-mono">{formatBrl(documento.valorTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-theme-muted">Nº Documento</p>
                <p className="text-sm font-mono">{documento.numeroDocumento || "—"}</p>
              </div>
            </div>
          )}

          {/* Metadados — modo edição */}
          {editando && form && (
            <div className="space-y-3">
              <label className="block text-sm space-y-1">
                <span className="text-theme-muted text-xs">Tipo de documento</span>
                <select
                  value={form.tipoDocumento}
                  onChange={(e) => setForm((f) => f && ({ ...f, tipoDocumento: e.target.value as TipoDocumentoFiscal }))}
                  className="w-full px-3 py-2 rounded border border-theme bg-transparent text-sm"
                >
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>{TIPO_LABEL[t]}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm space-y-1">
                <span className="text-theme-muted text-xs">Competência (mês/ano)</span>
                <input
                  type="month"
                  value={form.competencia}
                  onChange={(e) => setForm((f) => f && ({ ...f, competencia: e.target.value }))}
                  className="w-full px-3 py-2 rounded border border-theme bg-transparent text-sm"
                />
              </label>

              <label className="block text-sm space-y-1">
                <span className="text-theme-muted text-xs">Vencimento</span>
                <input
                  type="date"
                  value={form.vencimento}
                  onChange={(e) => setForm((f) => f && ({ ...f, vencimento: e.target.value }))}
                  className="w-full px-3 py-2 rounded border border-theme bg-transparent text-sm"
                />
              </label>

              <label className="block text-sm space-y-1">
                <span className="text-theme-muted text-xs">Valor (R$)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valorTotal}
                  onChange={(e) => setForm((f) => f && ({ ...f, valorTotal: e.target.value }))}
                  className="w-full px-3 py-2 rounded border border-theme bg-transparent text-sm font-mono"
                  placeholder="0,00"
                />
              </label>

              <label className="block text-sm space-y-1">
                <span className="text-theme-muted text-xs">Nº do documento</span>
                <input
                  type="text"
                  value={form.numeroDocumento}
                  onChange={(e) => setForm((f) => f && ({ ...f, numeroDocumento: e.target.value }))}
                  className="w-full px-3 py-2 rounded border border-theme bg-transparent text-sm font-mono"
                />
              </label>

              {erro && <p className="text-sm text-red-600">{erro}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={salvar}
                  disabled={salvando}
                  className="px-4 py-2 rounded bg-primary text-white text-sm disabled:opacity-60"
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  className="px-4 py-2 rounded border border-theme text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Erro de processamento */}
          {documento.erroProcessamento && (
            <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600">
              {documento.erroProcessamento}
            </div>
          )}

          {/* Obrigação vinculada */}
          {documento.obrigacao && (
            <div className="rounded border border-theme p-3 space-y-1">
              <p className="text-xs text-theme-muted">Obrigação vinculada</p>
              <p className="text-sm font-medium">{documento.obrigacao.tipo}</p>
              <p className="text-xs text-theme-muted">
                Vencimento: {new Date(documento.obrigacao.vencimento).toLocaleDateString("pt-BR")} • {documento.obrigacao.status}
              </p>
              {documento.obrigacao.valorTotal && (
                <p className="text-sm font-mono">{formatBrl(documento.obrigacao.valorTotal)}</p>
              )}
            </div>
          )}

          <p className="text-xs text-theme-muted">
            {(documento.tamanhoBytes / 1024).toFixed(1)} KB • {new Date(documento.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>

        {/* Ações */}
        {!editando && (
          <div className="px-6 py-4 mb-6 border-t border-theme flex items-center gap-2 flex-wrap">
            <a
              href={documento.arquivoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-theme text-xs text-theme-muted hover:text-theme transition-colors"
              title="Baixar PDF"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <polyline points="9 15 12 18 15 15"/>
              </svg>
              PDF
            </a>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-theme text-xs text-theme-muted hover:text-theme transition-colors"
              onClick={abrirEdicao}
              title="Editar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Editar
            </button>
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-theme text-xs text-theme-muted hover:text-theme transition-colors"
                onClick={() => setModoReprocessar((o) => !o)}
                title="Reprocessar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"/>
                  <path d="M3.51 15a9 9 0 1 0 .49-3.1"/>
                </svg>
                Reprocessar
              </button>
              {modoReprocessar && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setModoReprocessar(false)} />
                  <div className="absolute bottom-full mb-2 left-0 z-20 bg-theme-card border border-theme rounded-lg shadow-lg p-3 w-52 space-y-2">
                    <p className="text-xs text-theme-muted font-medium">Escolha o modo:</p>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 rounded border border-theme text-xs hover:border-primary/50 hover:text-theme transition-colors"
                      onClick={() => { setModoReprocessar(false); onReprocessar(documento.id, "SEMI_AUTO"); }}
                    >
                      <span className="font-medium block">Semiautomático</span>
                      <span className="text-theme-muted">Regex — rápido, sem custo</span>
                    </button>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 rounded border border-theme text-xs hover:border-primary/50 hover:text-theme transition-colors"
                      onClick={() => { setModoReprocessar(false); onReprocessar(documento.id, "IA"); }}
                    >
                      <span className="font-medium block">Com IA</span>
                      <span className="text-theme-muted">Claude Sonnet — mais preciso</span>
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              className="flex items-center p-1.5 rounded border border-red-500/40 text-red-500 hover:border-red-500 hover:text-red-600 transition-colors ml-auto"
              onClick={() => { onExcluir(documento.id); onClose(); }}
              title="Excluir"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
