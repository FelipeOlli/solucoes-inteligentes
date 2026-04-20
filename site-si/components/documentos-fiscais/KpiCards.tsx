"use client";

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
};

function formatBrl(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export function KpiCards({ total, pendentes, proximoVencimento, totalGasto12m }: Props) {
  const proxData = proximoVencimento
    ? new Date(proximoVencimento.vencimento).toLocaleDateString("pt-BR")
    : "—";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-theme-card border border-theme rounded-lg p-4">
        <p className="text-sm text-theme-muted">Total de documentos</p>
        <p className="text-2xl font-semibold font-mono text-theme-primary">{total}</p>
      </div>

      <div className="bg-theme-card border border-theme rounded-lg p-4">
        <p className="text-sm text-theme-muted">Próximo vencimento</p>
        <p className="text-2xl font-semibold font-mono text-amber-500">{proxData}</p>
        {proximoVencimento && (
          <p className="text-xs text-theme-muted mt-1">{proximoVencimento.tipo}</p>
        )}
      </div>

      <div className="bg-theme-card border border-theme rounded-lg p-4">
        <p className="text-sm text-theme-muted">Pendentes</p>
        <p className={`text-2xl font-semibold font-mono ${pendentes > 0 ? "text-red-500" : "text-green-500"}`}>
          {pendentes}
        </p>
      </div>

      <div className="bg-theme-card border border-theme rounded-lg p-4">
        <p className="text-sm text-theme-muted">Gasto 12 meses</p>
        <p className="text-2xl font-semibold font-mono text-theme-primary">
          {formatBrl(Number(totalGasto12m))}
        </p>
      </div>
    </div>
  );
}
