"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatDuracaoAbertaDesde } from "@/lib/duration-pt-br";

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

const STATUS_LABEL: Record<string, string> = {
  ABERTO: "Aberto",
  AGENDADO: "Agendado",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_PECA: "Aguardando peça",
  AGUARDANDO_CLIENTE: "Aguardando cliente",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

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

  return (
    <div className="text-theme">
      <h1 className="font-heading text-xl sm:text-2xl font-bold text-theme-primary mb-6">Serviços</h1>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <input
          type="search"
          placeholder="Buscar por código ou cliente..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="px-4 py-2 border rounded-lg font-body w-full sm:max-w-xs bg-theme-card border-theme text-theme"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg font-body w-full sm:w-auto bg-theme-card border-theme text-theme"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <p className="text-body text-theme-muted">Carregando…</p>
      ) : servicos.length === 0 ? (
        <p className="text-body text-theme-muted">Nenhum serviço encontrado.</p>
      ) : (
        <div className="grid gap-4">
          {servicos.map((s) => (
            <Link
              key={s.id}
              href={`/dashboard/servicos/${s.id}`}
              className="block p-4 bg-theme-card border rounded-lg border-theme shadow-sm hover:shadow transition text-theme"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-theme-primary">{s.codigo}</span>
                  <span className="ml-2 break-words">{s.cliente.nome}</span>
                </div>
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    s.statusAtual === "CONCLUIDO"
                      ? "bg-gray-200 text-gray-700"
                      : s.statusAtual === "CANCELADO"
                        ? "bg-red-100 text-red-800"
                        : "bg-secondary/20 text-white"
                  }`}
                >
                  {STATUS_LABEL[s.statusAtual] || s.statusAtual}
                </span>
              </div>
              <p className="text-sm text-theme-muted mt-1 break-words">
                {s.categoria?.nome ?? s.tipoServico ?? "—"} – {new Date(s.dataAbertura).toLocaleDateString("pt-BR")}
                {s.statusAtual !== "CONCLUIDO" && s.statusAtual !== "CANCELADO" && (
                  <span className="ml-2 text-secondary font-medium">
                    {formatDuracaoAbertaDesde(s.dataAbertura, nowTick)}
                  </span>
                )}
                {s.dataAgendamento && (
                  <span className="ml-2 text-white">Agendado: {new Date(s.dataAgendamento).toLocaleDateString("pt-BR")}</span>
                )}
                {s.valorEstimado != null && (
                  <span className="ml-2 font-medium">R$ {Number(s.valorEstimado).toLocaleString("pt-BR")}</span>
                )}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
