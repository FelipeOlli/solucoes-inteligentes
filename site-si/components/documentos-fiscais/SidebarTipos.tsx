"use client";

import { TipoDocumentoFiscal } from "@prisma/client";

const LABELS: Record<TipoDocumentoFiscal | "TODOS", string> = {
  TODOS: "Todos",
  DAS: "DAS",
  DARF_MAED: "DARF MAED",
  PGDAS_D_RECIBO: "PGDAS-D",
  DEFIS_RECIBO: "DEFIS",
  NOTIFICACAO_MAED: "Notificações",
  RELATORIO_SITUACAO: "Relatórios",
  OUTROS: "Outros",
};

const ICONS: Record<TipoDocumentoFiscal | "TODOS", string> = {
  TODOS: "📄",
  DAS: "💰",
  DARF_MAED: "⚠️",
  PGDAS_D_RECIBO: "📋",
  DEFIS_RECIBO: "📊",
  NOTIFICACAO_MAED: "📢",
  RELATORIO_SITUACAO: "📑",
  OUTROS: "📎",
};

type Contador = { tipo: TipoDocumentoFiscal; count: number };

type Props = {
  contadores: Contador[];
  tipoAtivo: TipoDocumentoFiscal | "TODOS";
  onChange: (tipo: TipoDocumentoFiscal | "TODOS") => void;
};

export function SidebarTipos({ contadores, tipoAtivo, onChange }: Props) {
  const totalGeral = contadores.reduce((s, c) => s + c.count, 0);
  const getCount = (tipo: TipoDocumentoFiscal) =>
    contadores.find((c) => c.tipo === tipo)?.count ?? 0;

  const tipos: (TipoDocumentoFiscal | "TODOS")[] = [
    "TODOS",
    "DAS",
    "DARF_MAED",
    "PGDAS_D_RECIBO",
    "DEFIS_RECIBO",
    "NOTIFICACAO_MAED",
    "RELATORIO_SITUACAO",
    "OUTROS",
  ];

  return (
    <aside className="bg-theme-card border border-theme rounded-lg p-3 space-y-1">
      {tipos.map((tipo) => {
        const count = tipo === "TODOS" ? totalGeral : getCount(tipo as TipoDocumentoFiscal);
        const ativo = tipoAtivo === tipo;
        return (
          <button
            key={tipo}
            type="button"
            onClick={() => onChange(tipo)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
              ativo
                ? "bg-primary text-white"
                : "hover:bg-theme-card text-theme"
            }`}
          >
            <span className="flex items-center gap-2">
              <span>{ICONS[tipo]}</span>
              <span>{LABELS[tipo]}</span>
            </span>
            <span className={`font-mono text-xs ${ativo ? "text-white/80" : "text-theme-muted"}`}>
              {count}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
