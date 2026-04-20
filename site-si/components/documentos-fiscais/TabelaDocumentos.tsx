"use client";

import { useState, useRef, useEffect } from "react";
import { TipoDocumentoFiscal, StatusProcessamentoFiscal } from "@prisma/client";

export type DocumentoRow = {
  id: string;
  tipoDocumento: TipoDocumentoFiscal;
  nomeArquivo: string;
  arquivoUrl: string;
  statusProcessamento: StatusProcessamentoFiscal;
  competencia: string | null;
  vencimento: string | null;
  valorTotal: string | null;
  numeroDocumento: string | null;
  createdAt: string;
  empresaFiscal: { cnpj: string; razaoSocial: string };
};

const TIPO_LABEL: Record<TipoDocumentoFiscal, string> = {
  DAS: "DAS",
  DARF_MAED: "MAED",
  PGDAS_D_RECIBO: "PGDAS-D",
  DEFIS_RECIBO: "DEFIS",
  NOTIFICACAO_MAED: "Notif.",
  RELATORIO_SITUACAO: "Relat.",
  OUTROS: "Outros",
};

const TIPO_COLOR: Record<TipoDocumentoFiscal, string> = {
  DAS: "bg-green-500/10 text-green-600",
  DARF_MAED: "bg-red-500/10 text-red-600",
  PGDAS_D_RECIBO: "bg-blue-500/10 text-blue-600",
  DEFIS_RECIBO: "bg-purple-500/10 text-purple-600",
  NOTIFICACAO_MAED: "bg-amber-500/10 text-amber-600",
  RELATORIO_SITUACAO: "bg-theme-muted/10 text-theme-muted",
  OUTROS: "bg-theme-muted/10 text-theme-muted",
};

const STATUS_LABEL: Record<StatusProcessamentoFiscal, string> = {
  PENDENTE: "Pendente",
  PROCESSANDO: "Processando",
  PROCESSADO: "Processado",
  PROCESSADO_COM_AVISOS: "Com avisos",
  ERRO: "Erro",
  MANUAL: "Manual",
};

const STATUS_COLOR: Record<StatusProcessamentoFiscal, string> = {
  PENDENTE: "text-amber-500",
  PROCESSANDO: "text-blue-500",
  PROCESSADO: "text-green-500",
  PROCESSADO_COM_AVISOS: "text-amber-500",
  ERRO: "text-red-500",
  MANUAL: "text-theme-muted",
};

function formatBrl(valor: string | null): string {
  if (!valor) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    parseFloat(valor)
  );
}

function formatCompetencia(data: string | null): string {
  if (!data) return "—";
  const d = new Date(data);
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

function formatData(data: string | null): string {
  if (!data) return "—";
  return new Date(data).toLocaleDateString("pt-BR");
}

function relativeTime(data: string): string {
  const diff = Date.now() - new Date(data).getTime();
  const dias = Math.floor(diff / 86400000);
  if (dias === 0) return "hoje";
  if (dias === 1) return "há 1 dia";
  if (dias < 30) return `há ${dias} dias`;
  return new Date(data).toLocaleDateString("pt-BR");
}

type Props = {
  documentos: DocumentoRow[];
  onSelecionar: (doc: DocumentoRow) => void;
  onExcluir: (id: string) => void;
  onReprocessar: (id: string, modo: "SEMI_AUTO" | "IA") => void;
};

type PopoverPos = { top: number; left: number };

export function TabelaDocumentos({ documentos, onSelecionar, onExcluir, onReprocessar }: Props) {
  const [popoverAberto, setPopoverAberto] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPos>({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPopoverAberto(null);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function abrirPopover(e: React.MouseEvent<HTMLButtonElement>, id: string) {
    if (popoverAberto === id) { setPopoverAberto(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverPos({ top: rect.bottom + 6, left: rect.right - 208 });
    setPopoverAberto(id);
  }

  if (documentos.length === 0) {
    return (
      <div className="bg-theme-card border border-theme rounded-lg p-8 text-center text-theme-muted text-sm">
        Nenhum documento encontrado.
      </div>
    );
  }

  return (
    <>
      {popoverAberto && (
        <div className="fixed inset-0 z-40" onClick={() => setPopoverAberto(null)} />
      )}
      {popoverAberto && (
        <div
          ref={popoverRef}
          className="fixed z-50 bg-theme-card border border-theme rounded-lg shadow-lg p-3 w-52 space-y-2"
          style={{ top: popoverPos.top, left: popoverPos.left }}
        >
          <p className="text-xs text-theme-muted font-medium">Escolha o modo:</p>
          <button
            type="button"
            className="w-full text-left px-3 py-2 rounded border border-theme text-xs hover:border-primary/50 hover:text-theme transition-colors"
            onClick={() => { setPopoverAberto(null); onReprocessar(popoverAberto, "SEMI_AUTO"); }}
          >
            <span className="font-medium block">Semiautomático</span>
            <span className="text-theme-muted">Regex — rápido, sem custo</span>
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-2 rounded border border-theme text-xs hover:border-primary/50 hover:text-theme transition-colors"
            onClick={() => { setPopoverAberto(null); onReprocessar(popoverAberto, "IA"); }}
          >
            <span className="font-medium block">Com IA</span>
            <span className="text-theme-muted">Claude Sonnet — mais preciso</span>
          </button>
        </div>
      )}

      <div className="bg-theme-card border border-theme rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-theme text-theme-muted text-left">
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Competência</th>
                <th className="px-4 py-3 font-medium font-mono">Nº Documento</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium font-mono">Valor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Upload</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b border-theme/50 hover:bg-primary/5 transition-colors cursor-pointer"
                  onClick={() => onSelecionar(doc)}
                >
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${TIPO_COLOR[doc.tipoDocumento]}`}>
                      {TIPO_LABEL[doc.tipoDocumento]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">{formatCompetencia(doc.competencia)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-theme-muted">
                    {doc.numeroDocumento || "—"}
                  </td>
                  <td className="px-4 py-3">{formatData(doc.vencimento)}</td>
                  <td className="px-4 py-3 font-mono">{formatBrl(doc.valorTotal)}</td>
                  <td className={`px-4 py-3 text-xs font-medium ${STATUS_COLOR[doc.statusProcessamento]}`}>
                    {STATUS_LABEL[doc.statusProcessamento]}
                  </td>
                  <td className="px-4 py-3 text-xs text-theme-muted">{relativeTime(doc.createdAt)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2 items-center">
                      <a
                        href={doc.arquivoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:opacity-70 transition-opacity"
                        title="Abrir PDF"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="9" y1="13" x2="15" y2="13"/>
                          <line x1="9" y1="17" x2="15" y2="17"/>
                          <polyline points="9 9 10 9"/>
                        </svg>
                      </a>
                      <button
                        type="button"
                        className="text-theme-muted hover:opacity-70 transition-opacity"
                        onClick={(e) => abrirPopover(e, doc.id)}
                        title="Reprocessar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1 4 1 10 7 10"/>
                          <path d="M3.51 15a9 9 0 1 0 .49-3.1"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="text-red-600 hover:opacity-70 transition-opacity"
                        onClick={() => onExcluir(doc.id)}
                        title="Excluir"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6"/>
                          <path d="M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
