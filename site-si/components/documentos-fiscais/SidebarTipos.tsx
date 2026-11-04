"use client";

import { TipoDocumentoFiscal } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    <Card className="p-3">
      <CardContent className="space-y-1 p-0">
        {tipos.map((tipo) => {
          const count = tipo === "TODOS" ? totalGeral : getCount(tipo as TipoDocumentoFiscal);
          const ativo = tipoAtivo === tipo;
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => onChange(tipo)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-control px-3 py-2 text-sm transition-all duration-300",
                ativo
                  ? "bg-brand text-brand-fg shadow-brand"
                  : "text-ink-muted hover:bg-surface-hover hover:text-ink"
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="shrink-0">{ICONS[tipo]}</span>
                <span className="truncate">{LABELS[tipo]}</span>
              </span>
              <span className={cn("shrink-0 font-mono text-xs", ativo ? "text-brand-fg/80" : "text-ink-muted")}>
                {count}
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
