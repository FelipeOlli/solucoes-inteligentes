"use client";

import { useState, useRef, useEffect } from "react";
import { TipoDocumentoFiscal, StatusProcessamentoFiscal, StatusPagamentoFiscal } from "@prisma/client";
import { brl } from "@/lib/format";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  statusPagamento: StatusPagamentoFiscal;
  dataPagamento: string | null;
  valorPago: string | null;
  comprovanteUrl: string | null;
  comprovanteNomeArquivo: string | null;
  comprovanteTamanhoBytes: number | null;
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
  DAS:                "border border-line text-ink-muted",
  DARF_MAED:          "border border-line text-ink-muted",
  PGDAS_D_RECIBO:     "border border-line text-ink-muted",
  DEFIS_RECIBO:       "border border-line text-ink-muted",
  NOTIFICACAO_MAED:   "border border-line text-ink-muted",
  RELATORIO_SITUACAO: "border border-line text-ink-muted",
  OUTROS:             "border border-line text-ink-muted",
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
  PENDENTE: "text-warn",
  PROCESSANDO: "text-brand",
  PROCESSADO: "text-accent",
  PROCESSADO_COM_AVISOS: "text-warn",
  ERRO: "text-red-500",
  MANUAL: "text-ink-muted",
};

const PGTO_LABEL: Record<StatusPagamentoFiscal, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  ATRASADO: "Atrasado",
  ISENTO: "Isento",
  NAO_APLICAVEL: "N/A",
};

const PGTO_CLASS: Record<StatusPagamentoFiscal, string> = {
  PENDENTE: "pgto-pendente",
  PAGO: "pgto-pago",
  ATRASADO: "pgto-atrasado",
  ISENTO: "pgto-isento",
  NAO_APLICAVEL: "pgto-nao-aplicavel",
};

function statusPagamentoEfetivo(doc: DocumentoRow): StatusPagamentoFiscal {
  if (doc.statusPagamento === "NAO_APLICAVEL") return "NAO_APLICAVEL";
  if (doc.statusPagamento !== "PENDENTE") return doc.statusPagamento;
  if (doc.vencimento && new Date(doc.vencimento) < new Date()) return "ATRASADO";
  return "PENDENTE";
}

function formatBrl(valor: string | null): string {
  if (!valor) return "—";
  return brl(parseFloat(valor));
}

function formatCompetencia(data: string | null): string {
  if (!data) return "—";
  const d = new Date(data);
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

function formatData(data: string | null): string {
  if (!data) return "—";
  return new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
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

  useEffect(() => {
    if (!popoverAberto) return;
    function handleOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverAberto(null);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [popoverAberto]);

  function abrirPopover(e: React.MouseEvent<HTMLButtonElement>, id: string) {
    if (popoverAberto === id) { setPopoverAberto(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const popW = 208;
    const popH = 120;
    const margin = 8;
    const left = Math.min(rect.right - popW, window.innerWidth - popW - margin);
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= popH + 6 ? rect.bottom + 6 : rect.top - popH - 6;
    setPopoverPos({ top, left: Math.max(margin, left) });
    setPopoverAberto(id);
  }

  if (documentos.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-ink-muted">
        Nenhum documento encontrado.
      </Card>
    );
  }

  return (
    <>
      {popoverAberto && (
        <div
          ref={popoverRef}
          className="fixed z-50 w-52 space-y-2 rounded-card border border-line bg-surface p-3 shadow-card-hover"
          style={{ top: popoverPos.top, left: popoverPos.left }}
        >
          <p className="text-xs font-medium text-ink-muted">Escolha o modo:</p>
          <button
            type="button"
            className="w-full rounded-control border border-line px-3 py-2 text-left text-xs transition-colors hover:border-brand/40 hover:text-ink"
            onClick={() => { setPopoverAberto(null); onReprocessar(popoverAberto, "SEMI_AUTO"); }}
          >
            <span className="block font-medium">Semiautomático</span>
            <span className="text-ink-muted">Regex — rápido, sem custo</span>
          </button>
          <button
            type="button"
            className="w-full rounded-control border border-line px-3 py-2 text-left text-xs transition-colors hover:border-brand/40 hover:text-ink"
            onClick={() => { setPopoverAberto(null); onReprocessar(popoverAberto, "IA"); }}
          >
            <span className="block font-medium">Com IA</span>
            <span className="text-ink-muted">Claude Sonnet — mais preciso</span>
          </button>
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader className="bg-surface-subtle">
            <TableRow className="hover:bg-surface-subtle">
              <TableHead>Tipo</TableHead>
              <TableHead>Competência</TableHead>
              <TableHead className="font-mono">Nº Documento</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="font-mono">Valor</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Upload</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documentos.map((doc) => (
              <TableRow
                key={doc.id}
                className="cursor-pointer"
                onClick={() => onSelecionar(doc)}
              >
                <TableCell>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIPO_COLOR[doc.tipoDocumento]}`}>
                    {TIPO_LABEL[doc.tipoDocumento]}
                  </span>
                </TableCell>
                <TableCell className="font-mono">{formatCompetencia(doc.competencia)}</TableCell>
                <TableCell className="font-mono text-xs text-ink-muted">
                  {doc.numeroDocumento || "—"}
                </TableCell>
                <TableCell>{formatData(doc.vencimento)}</TableCell>
                <TableCell className="font-mono">{formatBrl(doc.valorTotal)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PGTO_CLASS[statusPagamentoEfetivo(doc)]}`}>
                      {PGTO_LABEL[statusPagamentoEfetivo(doc)]}
                    </span>
                    {doc.comprovanteUrl && (
                      <span title="Comprovante anexado" className="text-accent">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                        </svg>
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-ink-muted">{relativeTime(doc.createdAt)}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                      {/* ícone de status de processamento */}
                      {doc.statusProcessamento === "PROCESSADO" && (
                        <span title="Processado" className="shrink-0 text-accent">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                      )}
                      {doc.statusProcessamento === "PROCESSADO_COM_AVISOS" && (
                        <span title="Processado com avisos" className="shrink-0 text-warn">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </span>
                      )}
                      {doc.statusProcessamento === "ERRO" && (
                        <span title="Erro no processamento" className="shrink-0 text-red-500">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        </span>
                      )}
                      {doc.statusProcessamento === "MANUAL" && (
                        <span title="Preenchido manualmente" className="shrink-0 text-ink-muted">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </span>
                      )}
                      {(doc.statusProcessamento === "PENDENTE" || doc.statusProcessamento === "PROCESSANDO") && (
                        <span title={STATUS_LABEL[doc.statusProcessamento]} className="shrink-0 text-warn">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </span>
                      )}
                      <a
                        href={doc.arquivoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand transition-opacity hover:opacity-70"
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
                        className="text-ink-muted transition-opacity hover:opacity-70"
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
                        className="text-red-600 transition-opacity hover:opacity-70"
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </Card>
    </>
  );
}
