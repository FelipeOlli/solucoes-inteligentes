"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { brl } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  custoFixo: number;
  garantia: number;
  taxa: number;
  imposto: number;
  lucro: number;
  contabilidade: number;
  servicos: number;
};

type ResumoResponse = {
  meses: MesData[];
  resumoMesAtual: {
    receita: number;
    repasse: number;
    material: number;
    custoFixo: number;
    garantia: number;
    taxa: number;
    imposto: number;
    lucro: number;
    contabilidade: number;
    lucroLiquido: number;
    servicos: number;
    abertos: number;
  };
};

const fmt = brl;

/** Eixo Y: mil com uma casa, nunca duplicado (1250 -> 1,3k). */
function formatAxisValue(v: number): string {
  if (Math.abs(v) >= 1000) return `R${(v / 1000).toFixed(1).replace(".", ",")}k`;
  return `R${v}`;
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
    <div className="rounded-control border border-line bg-surface px-3 py-2 text-sm shadow-card">
      <p className="mb-1 font-semibold text-ink">{label}</p>
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

  if (loading) return <p className="text-sm text-ink-muted">Carregando…</p>;
  if (!dados) return <p className="text-sm text-ink-muted">Não foi possível carregar os dados.</p>;

  const { resumoMesAtual: r, meses } = dados;
  const lucroTotal12 = meses.reduce((acc, m) => acc + m.lucro, 0);
  const lucroLiquido12 = meses.reduce((acc, m) => acc + m.lucro - m.contabilidade, 0);

  return (
    <div>
      <PageHeader
        title="Painel Financeiro"
        description="Receita, custos e lucro dos últimos 12 meses."
      />

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          title="Receita bruta"
          value={fmt(r.receita)}
          hint="mês atual"
          accent
          delay={0}
        />
        <StatCard
          title="Lucro operacional"
          value={fmt(r.lucro)}
          hint="antes da contabilidade"
          delay={80}
        />
        <StatCard
          title="Contabilidade do mês"
          value={r.contabilidade > 0 ? fmt(r.contabilidade) : "—"}
          hint="documentos pagos"
          delay={160}
        />
        <StatCard
          title="Lucro líquido"
          value={fmt(r.lucroLiquido)}
          hint="após custos e impostos"
          delay={240}
        />
        <StatCard title="Concluídos no mês" value={r.servicos} delay={320} />
        <StatCard title="Em aberto agora" value={r.abertos} delay={400} />
      </div>

      {/* Breakdown de custos do mês */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Composição do lucro — mês atual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4 lg:grid-cols-8">
            <div>
              <p className="mb-0.5 text-ink-muted">Receita</p>
              <p className="font-semibold text-ink">{fmt(r.receita)}</p>
            </div>
            <div>
              <p className="mb-0.5 text-ink-muted">− Repasses</p>
              <p className="font-semibold text-red-500">{r.repasse > 0 ? fmt(r.repasse) : <span className="text-ink-muted">—</span>}</p>
            </div>
            <div>
              <p className="mb-0.5 text-ink-muted">− Material</p>
              <p className="font-semibold text-orange-500">{r.material > 0 ? fmt(r.material) : <span className="text-ink-muted">—</span>}</p>
            </div>
            <div>
              <p className="mb-0.5 text-ink-muted">− Deslocamento</p>
              <p className="font-semibold text-orange-500">{r.custoFixo > 0 ? fmt(r.custoFixo) : <span className="text-ink-muted">—</span>}</p>
            </div>
            <div>
              <p className="mb-0.5 text-ink-muted">− Garantia</p>
              <p className="font-semibold text-orange-500">{r.garantia > 0 ? fmt(r.garantia) : <span className="text-ink-muted">—</span>}</p>
            </div>
            <div>
              <p className="mb-0.5 text-ink-muted">− Taxa cartão</p>
              <p className="font-semibold text-yellow-500">{r.taxa > 0 ? fmt(r.taxa) : <span className="text-ink-muted">—</span>}</p>
            </div>
            <div>
              <p className="mb-0.5 text-ink-muted">− Imposto</p>
              <p className="font-semibold text-yellow-500">{r.imposto > 0 ? fmt(r.imposto) : <span className="text-ink-muted">—</span>}</p>
            </div>
            <div>
              <p className="mb-0.5 text-ink-muted">− Contabilidade</p>
              <p className="font-semibold text-cyan-500">{r.contabilidade > 0 ? fmt(r.contabilidade) : <span className="text-ink-muted">—</span>}</p>
            </div>
            <div className="col-span-2 border-l border-line pl-3 md:col-span-4 lg:col-span-1">
              <p className="mb-0.5 text-ink-muted">= Lucro líquido</p>
              <p className={`text-base font-bold ${r.lucroLiquido >= 0 ? "text-accent" : "text-red-500"}`}>{fmt(r.lucroLiquido)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de barras */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Receita, Custos e Lucro — últimos 12 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={meses} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<TooltipCustom />} cursor={{ fill: "rgba(128,128,128,0.08)" }} />
              <Legend />
              <Bar dataKey="receita" name="Receita" fill="#122969" radius={[12, 12, 0, 0]} maxBarSize={48} />
              <Bar dataKey="repasse" name="Repasse" fill="#f87171" radius={[12, 12, 0, 0]} maxBarSize={48} />
              <Bar dataKey="material" name="Material" fill="#fb923c" radius={[12, 12, 0, 0]} maxBarSize={48} />
              <Bar dataKey="custoFixo" name="Deslocamento" fill="#fdba74" radius={[12, 12, 0, 0]} maxBarSize={48} />
              <Bar dataKey="garantia" name="Garantia" fill="#fcd34d" radius={[12, 12, 0, 0]} maxBarSize={48} />
              <Bar dataKey="taxa" name="Taxa cartão" fill="#eab308" radius={[12, 12, 0, 0]} maxBarSize={48} />
              <Bar dataKey="imposto" name="Imposto" fill="#a855f7" radius={[12, 12, 0, 0]} maxBarSize={48} />
              <Bar dataKey="contabilidade" name="Contabilidade" fill="#06b6d4" radius={[12, 12, 0, 0]} maxBarSize={48} />
              <Bar dataKey="lucro" name="Lucro" fill="#19cb96" radius={[12, 12, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de linha: tendência de lucro */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Tendência de lucro — 12 meses</CardTitle>
            <div className="text-right text-sm">
              <p className={`font-medium ${lucroTotal12 >= 0 ? "text-accent" : "text-red-500"}`}>Operacional: {fmt(lucroTotal12)}</p>
              <p className={`font-medium ${lucroLiquido12 >= 0 ? "text-accent" : "text-red-500"}`}>Líquido: {fmt(lucroLiquido12)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={meses} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<TooltipCustom />} />
              <ReferenceLine y={0} stroke="rgba(128,128,128,0.5)" />
              <Line
                type="monotone"
                dataKey="lucro"
                name="Lucro operacional"
                stroke="#19cb96"
                strokeWidth={2}
                dot={{ fill: "#19cb96", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela resumo mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow className="hover:bg-surface-subtle">
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Serviços</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Repasse</TableHead>
                <TableHead className="text-right">Material</TableHead>
                <TableHead className="text-right">Deslocamento</TableHead>
                <TableHead className="text-right">Garantia</TableHead>
                <TableHead className="text-right">Taxa cartão</TableHead>
                <TableHead className="text-right">Imposto</TableHead>
                <TableHead className="text-right">Contabilidade</TableHead>
                <TableHead className="text-right">Lucro líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...meses].reverse().map((m) => {
                const ll = Math.round((m.lucro - m.contabilidade) * 100) / 100;
                return (
                  <TableRow key={m.mes}>
                    <TableCell className="font-medium">{m.mes}</TableCell>
                    <TableCell className="text-right text-ink-muted">{m.servicos}</TableCell>
                    <TableCell className="text-right">{m.receita > 0 ? fmt(m.receita) : <span className="text-ink-muted">—</span>}</TableCell>
                    <TableCell className="text-right text-red-500">{m.repasse > 0 ? fmt(m.repasse) : <span className="text-ink-muted">—</span>}</TableCell>
                    <TableCell className="text-right text-orange-500">{m.material > 0 ? fmt(m.material) : <span className="text-ink-muted">—</span>}</TableCell>
                    <TableCell className="text-right text-orange-500">{m.custoFixo > 0 ? fmt(m.custoFixo) : <span className="text-ink-muted">—</span>}</TableCell>
                    <TableCell className="text-right text-orange-500">{m.garantia > 0 ? fmt(m.garantia) : <span className="text-ink-muted">—</span>}</TableCell>
                    <TableCell className="text-right text-yellow-500">{m.taxa > 0 ? fmt(m.taxa) : <span className="text-ink-muted">—</span>}</TableCell>
                    <TableCell className="text-right text-yellow-500">{m.imposto > 0 ? fmt(m.imposto) : <span className="text-ink-muted">—</span>}</TableCell>
                    <TableCell className="text-right text-cyan-500">{m.contabilidade > 0 ? fmt(m.contabilidade) : <span className="text-ink-muted">—</span>}</TableCell>
                    <TableCell className={`text-right font-medium ${ll > 0 ? "text-accent" : ll < 0 ? "text-red-500" : "text-ink-muted"}`}>
                      {m.servicos > 0 || m.contabilidade > 0 ? fmt(ll) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
