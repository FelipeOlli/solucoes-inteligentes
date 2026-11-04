"use client";

import { brl as formatBrl } from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";

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

export function KpiCards({ total, pendentes, proximoVencimento, totalGasto12m, pagosCount, atrasadosCount, totalPagoMes }: Props) {
  const proxData = proximoVencimento
    ? new Date(proximoVencimento.vencimento).toLocaleDateString("pt-BR", { timeZone: "UTC" })
    : "—";

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      <StatCard title="Total" value={String(total)} accent delay={0} />
      <StatCard title="Próx. vencimento" value={proxData} hint={proximoVencimento?.tipo} delay={60} />
      <StatCard title="Pendentes" value={String(pendentes)} delay={120} />
      <StatCard title="Gasto 12 meses" value={formatBrl(Number(totalGasto12m))} delay={180} />
      <StatCard title="Pagos" value={String(pagosCount)} delay={240} />
      <StatCard title="Atrasados" value={String(atrasadosCount)} delay={300} />
      <StatCard title="Pago no mês" value={formatBrl(Number(totalPagoMes))} delay={360} />
    </div>
  );
}
