"use client";

import { brl as formatBrl } from "@/lib/format";

type ProximoVencimento = {
  vencimento: string;
  tipo: string;
  valorTotal: number | null;
} | null;

type Props = {
  total: number;
  pendentes: number;
  proximoVencimento: ProximoVencimento;
  totalGasto12m: number;
  pagosCount: number;
  atrasadosCount: number;
  totalPagoMes: number;
};

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-theme-card border border-theme rounded-lg p-3 min-w-0">
      <p className="text-xs text-theme-muted leading-tight mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono truncate leading-tight ${color ?? "text-theme-primary"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-theme-muted mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

export function KpiCards({ total, pendentes, proximoVencimento, totalGasto12m, pagosCount, atrasadosCount, totalPagoMes }: Props) {
  const proxData = proximoVencimento
    ? new Date(proximoVencimento.vencimento).toLocaleDateString("pt-BR", { timeZone: "UTC" })
    : "—";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      <KpiCard label="Total" value={String(total)} />
      <KpiCard
        label="Próx. vencimento"
        value={proxData}
        sub={proximoVencimento?.tipo}
        color="text-amber-500"
      />
      <KpiCard
        label="Pendentes"
        value={String(pendentes)}
        color={pendentes > 0 ? "text-red-500" : "text-green-500"}
      />
      <KpiCard
        label="Gasto 12 meses"
        value={formatBrl(Number(totalGasto12m))}
        color="text-theme-primary"
      />
      <KpiCard
        label="Pagos"
        value={String(pagosCount)}
        color={pagosCount > 0 ? "text-green-500" : "text-theme-primary"}
      />
      <KpiCard
        label="Atrasados"
        value={String(atrasadosCount)}
        color={atrasadosCount > 0 ? "text-red-500" : "text-green-500"}
      />
      <KpiCard
        label="Pago no mês"
        value={formatBrl(Number(totalPagoMes))}
        color="text-green-600"
      />
    </div>
  );
}
