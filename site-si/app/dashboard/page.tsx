"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, CircleDollarSign, CheckCircle2, Activity } from "lucide-react";
import { api } from "@/lib/api";
import { formatDuracaoAbertaDesde } from "@/lib/duration-pt-br";
import { brl } from "@/lib/format";
import { STATUS_LABEL, getStatusBadgeClass } from "@/lib/status";
import AoVivoWidget from "@/components/dashboard/AoVivoWidget";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";

type Servico = {
  id: string;
  codigo: string;
  tipoServico: string | null;
  categoria: { id: string; nome: string } | null;
  statusAtual: string;
  dataAbertura: string;
  dataAgendamento: string | null;
  valorEstimado: number | null;
  cliente: { nome: string; email: string };
};

const FINAIS = ["CONCLUIDO", "CANCELADO"];

export default function DashboardPage() {
  const router = useRouter();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (q) params.set("q", q);
    api<Servico[]>(`/servicos?${params}`)
      .then(({ data, error, status }) => {
        if (status === 401) {
          router.push("/login");
          return;
        }
        if (error) return;
        setServicos(data || []);
      })
      .finally(() => setLoading(false));
  }, [router, statusFilter, q]);

  // Os KPIs vêm da mesma lista já carregada — sem endpoint extra.
  const emAberto = servicos.filter((s) => !FINAIS.includes(s.statusAtual));
  const emAndamento = servicos.filter((s) => s.statusAtual === "EM_ANDAMENTO");
  const concluidosMes = servicos.filter((s) => {
    if (s.statusAtual !== "CONCLUIDO") return false;
    const d = new Date(s.dataAbertura);
    const hoje = new Date();
    return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  });
  const valorEmAberto = emAberto.reduce(
    (acc, s) => acc + (s.valorEstimado != null ? Number(s.valorEstimado) : 0),
    0
  );

  return (
    <div>
      <PageHeader
        title="Serviços"
        description="Acompanhe os atendimentos em andamento e o histórico da operação."
        actions={
          <Button href="/dashboard/servicos/novo" className="w-full sm:w-auto">
            + Novo serviço
          </Button>
        }
      />

      <AoVivoWidget />

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Em aberto"
          value={emAberto.length}
          hint="serviços não finalizados"
          icon={Activity}
          accent
          delay={0}
        />
        <StatCard
          title="Em andamento"
          value={emAndamento.length}
          hint="com técnico em atendimento"
          icon={CalendarClock}
          delay={80}
        />
        <StatCard
          title="Concluídos no mês"
          value={concluidosMes.length}
          icon={CheckCircle2}
          delay={160}
        />
        <StatCard
          title="Valor em aberto"
          value={brl(valorEmAberto)}
          hint="soma dos serviços ativos"
          icon={CircleDollarSign}
          delay={240}
        />
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Input
          type="search"
          placeholder="Buscar por código ou cliente..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando…</p>
      ) : servicos.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhum serviço encontrado.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...servicos]
            .sort((a, b) => {
              const aFinalizado = FINAIS.includes(a.statusAtual);
              const bFinalizado = FINAIS.includes(b.statusAtual);
              if (aFinalizado !== bFinalizado) return aFinalizado ? 1 : -1;
              return new Date(b.dataAbertura).getTime() - new Date(a.dataAbertura).getTime();
            })
            .map((s, i) => (
              <Link
                key={s.id}
                href={`/dashboard/servicos/${s.id}`}
                style={{ animationDelay: `${Math.min(i, 10) * 60}ms` }}
                className={cn(
                  "animate-slide-in-up flex flex-col gap-3 rounded-card border border-line bg-surface p-4 text-ink shadow-card transition-all duration-300",
                  "hover:-translate-y-0.5 hover:shadow-card-hover"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-heading font-semibold text-brand">{s.codigo}</span>
                    <p className="break-words text-sm text-ink">{s.cliente.nome}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                      getStatusBadgeClass(s.statusAtual)
                    )}
                  >
                    {STATUS_LABEL[s.statusAtual] || s.statusAtual}
                  </span>
                </div>

                <div className="mt-auto space-y-1 text-xs text-ink-muted">
                  <p className="truncate">
                    {s.categoria?.nome ?? s.tipoServico ?? "—"} ·{" "}
                    {new Date(s.dataAbertura).toLocaleDateString("pt-BR")}
                  </p>
                  {s.statusAtual !== "CONCLUIDO" && s.statusAtual !== "CANCELADO" && (
                    <p className="font-medium text-accent">
                      {formatDuracaoAbertaDesde(s.dataAbertura, nowTick)}
                    </p>
                  )}
                  {s.dataAgendamento && (
                    <p>
                      Agendado: {new Date(s.dataAgendamento).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                  {s.valorEstimado != null && (
                    <p className="font-heading text-sm font-semibold text-ink">
                      {brl(Number(s.valorEstimado))}
                    </p>
                  )}
                </div>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
