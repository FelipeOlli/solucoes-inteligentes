"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";

type MesData = {
  mes: string;
  receita: number;
  repasse: number;
  material: number;
  notaFiscal: number;
  taxa: number;
  custoFixo: number;
  lucro: number;
  servicos: number;
};

type ResumoResponse = {
  meses: MesData[];
  resumoMesAtual: {
    receita: number;
    repasse: number;
    material: number;
    notaFiscal: number;
    taxa: number;
    custoFixo: number;
    lucro: number;
    servicos: number;
    abertos: number;
  };
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const TooltipCustom = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-theme-card border border-theme rounded-lg px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold mb-1 text-theme-primary">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function FinanceiroPage() {
  const router = useRouter();
  const [dados, setDados] = useState<ResumoResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ResumoResponse>("/financeiro/resumo").then(({ data, status }) => {
      if (status === 401) router.push("/login");
      setDados(data ?? null);
      setLoading(false);
    });
  }, [router]);

  if (loading) return <p className="text-body">Carregando…</p>;
  if (!dados) return <p className="text-body">Não foi possível carregar os dados.</p>;

  const { resumoMesAtual: r, meses } = dados;
  const lucroTotal12 = meses.reduce((acc, m) => acc + m.lucro, 0);

  return (
    <div className="text-theme space-y-6">
      <h1 className="font-heading text-2xl font-bold text-theme-primary">Painel Financeiro</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-theme-card border border-theme rounded-xl p-4">
          <p className="text-xs text-theme-muted mb-1">Receita bruta</p>
          <p className="font-bold text-lg text-theme-primary">{fmt(r.receita)}</p>
        </div>
        <div className="bg-theme-card border border-theme rounded-xl p-4">
          <p className="text-xs text-theme-muted mb-1">Lucro real do mês</p>
          <p className={`font-bold text-lg ${r.lucro >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(r.lucro)}</p>
        </div>
        <div className="bg-theme-card border border-theme rounded-xl p-4">
          <p className="text-xs text-theme-muted mb-1">Nota fiscal do mês</p>
          <p className="font-bold text-lg text-purple-400">{r.notaFiscal > 0 ? fmt(r.notaFiscal) : <span className="text-theme-muted text-base">—</span>}</p>
        </div>
        <div className="bg-theme-card border border-theme rounded-xl p-4">
          <p className="text-xs text-theme-muted mb-1">Concluídos no mês</p>
          <p className="font-bold text-lg text-theme-primary">{r.servicos}</p>
        </div>
        <div className="bg-theme-card border border-theme rounded-xl p-4">
          <p className="text-xs text-theme-muted mb-1">Em aberto agora</p>
          <p className="font-bold text-lg text-theme-primary">{r.abertos}</p>
        </div>
      </div>

      {/* Breakdown de custos do mês */}
      <div className="bg-theme-card border border-theme rounded-xl p-4">
        <h2 className="font-heading font-semibold text-theme-primary mb-3">Composição do lucro — mês atual</h2>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3 text-sm">
          <div>
            <p className="text-theme-muted mb-0.5">Receita</p>
            <p className="font-semibold text-theme-primary">{fmt(r.receita)}</p>
          </div>
          <div>
            <p className="text-theme-muted mb-0.5">− Repasses</p>
            <p className="font-semibold text-red-400">{r.repasse > 0 ? fmt(r.repasse) : <span className="text-theme-muted">—</span>}</p>
          </div>
          <div>
            <p className="text-theme-muted mb-0.5">− Material</p>
            <p className="font-semibold text-orange-400">{r.material > 0 ? fmt(r.material) : <span className="text-theme-muted">—</span>}</p>
          </div>
          <div>
            <p className="text-theme-muted mb-0.5">− NF (5%)</p>
            <p className="font-semibold text-purple-400">{r.notaFiscal > 0 ? fmt(r.notaFiscal) : <span className="text-theme-muted">—</span>}</p>
          </div>
          <div>
            <p className="text-theme-muted mb-0.5">− Taxa cartão</p>
            <p className="font-semibold text-yellow-500">{r.taxa > 0 ? fmt(r.taxa) : <span className="text-theme-muted">—</span>}</p>
          </div>
          <div>
            <p className="text-theme-muted mb-0.5">− Custo fixo</p>
            <p className="font-semibold text-yellow-400">{r.custoFixo > 0 ? fmt(r.custoFixo) : <span className="text-theme-muted">—</span>}</p>
          </div>
          <div className="border-l border-theme pl-3">
            <p className="text-theme-muted mb-0.5">= Lucro real</p>
            <p className={`font-bold text-base ${r.lucro >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(r.lucro)}</p>
          </div>
        </div>
      </div>

      {/* Gráfico de barras: Receita vs Repasse vs Lucro */}
      <div className="bg-theme-card border border-theme rounded-xl p-4">
        <h2 className="font-heading font-semibold text-theme-primary mb-4">Receita, Custos e Lucro — últimos 12 meses</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={meses} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v: number) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 11 }} />
            <Tooltip content={<TooltipCustom />} />
            <Legend />
            <Bar dataKey="receita" name="Receita" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="repasse" name="Repasse" fill="#f87171" radius={[4, 4, 0, 0]} />
            <Bar dataKey="material" name="Material" fill="#fb923c" radius={[4, 4, 0, 0]} />
            <Bar dataKey="notaFiscal" name="Nota Fiscal" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            <Bar dataKey="taxa" name="Taxa cartão" fill="#eab308" radius={[4, 4, 0, 0]} />
            <Bar dataKey="custoFixo" name="Custo fixo" fill="#facc15" radius={[4, 4, 0, 0]} />
            <Bar dataKey="lucro" name="Lucro" fill="#34d399" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de linha: tendência de lucro */}
      <div className="bg-theme-card border border-theme rounded-xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-heading font-semibold text-theme-primary">Tendência de lucro — 12 meses</h2>
          <span className={`text-sm font-medium ${lucroTotal12 >= 0 ? "text-green-400" : "text-red-400"}`}>
            Total: {fmt(lucroTotal12)}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={meses} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v: number) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 11 }} />
            <Tooltip content={<TooltipCustom />} />
            <ReferenceLine y={0} stroke="rgba(128,128,128,0.5)" />
            <Line
              type="monotone"
              dataKey="lucro"
              name="Lucro"
              stroke="#34d399"
              strokeWidth={2}
              dot={{ fill: "#34d399", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela resumo mensal */}
      <div className="bg-theme-card border border-theme rounded-xl p-4 overflow-x-auto">
        <h2 className="font-heading font-semibold text-theme-primary mb-4">Resumo mensal</h2>
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="text-left text-theme-muted border-b border-theme">
              <th className="pb-2 font-medium">Mês</th>
              <th className="pb-2 font-medium text-right">Serviços</th>
              <th className="pb-2 font-medium text-right">Receita</th>
              <th className="pb-2 font-medium text-right">Repasse</th>
              <th className="pb-2 font-medium text-right">Material</th>
              <th className="pb-2 font-medium text-right">NF (5%)</th>
              <th className="pb-2 font-medium text-right">Taxa cartão</th>
              <th className="pb-2 font-medium text-right">Custo fixo</th>
              <th className="pb-2 font-medium text-right">Lucro real</th>
            </tr>
          </thead>
          <tbody>
            {[...meses].reverse().map((m) => (
              <tr key={m.mes} className="border-b border-theme/40 last:border-0">
                <td className="py-2 font-medium">{m.mes}</td>
                <td className="py-2 text-right text-theme-muted">{m.servicos}</td>
                <td className="py-2 text-right">{m.receita > 0 ? fmt(m.receita) : <span className="text-theme-muted">—</span>}</td>
                <td className="py-2 text-right text-red-400">{m.repasse > 0 ? fmt(m.repasse) : <span className="text-theme-muted">—</span>}</td>
                <td className="py-2 text-right text-orange-400">{m.material > 0 ? fmt(m.material) : <span className="text-theme-muted">—</span>}</td>
                <td className="py-2 text-right text-purple-400">{m.notaFiscal > 0 ? fmt(m.notaFiscal) : <span className="text-theme-muted">—</span>}</td>
                <td className="py-2 text-right text-yellow-500">{m.taxa > 0 ? fmt(m.taxa) : <span className="text-theme-muted">—</span>}</td>
                <td className="py-2 text-right text-yellow-400">{m.custoFixo > 0 ? fmt(m.custoFixo) : <span className="text-theme-muted">—</span>}</td>
                <td className={`py-2 text-right font-medium ${m.lucro > 0 ? "text-green-400" : m.lucro < 0 ? "text-red-400" : "text-theme-muted"}`}>
                  {m.servicos > 0 ? fmt(m.lucro) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
