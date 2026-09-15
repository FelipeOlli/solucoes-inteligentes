"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type AoVivo = {
  emAndamento: {
    id: string;
    inicioEm: string;
    tecnico: { id: string; nome: string };
    servico: { id: string; codigo: string; descricao: string; enderecoServico: string | null };
  }[];
  aguardandoCheckin: {
    id: string;
    codigo: string;
    descricao: string;
    dataAgendamento: string | null;
    statusAtual: string;
    tecnico: { id: string; nome: string } | null;
  }[];
};

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function AoVivoWidget() {
  const [dados, setDados] = useState<AoVivo | null>(null);

  useEffect(() => {
    function carregar() {
      api<AoVivo>("/agenda/ao-vivo").then(({ data }) => {
        if (data) setDados(data);
      });
    }
    carregar();
    const id = window.setInterval(carregar, 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!dados || (dados.emAndamento.length === 0 && dados.aguardandoCheckin.length === 0)) return null;

  return (
    <div className="bg-theme-card p-4 rounded-lg border border-theme mb-6">
      <h2 className="font-heading font-bold text-theme-primary mb-3 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        Ao vivo
      </h2>

      {dados.emAndamento.length > 0 && (
        <div className="space-y-2 mb-3">
          {dados.emAndamento.map((v) => (
            <Link
              key={v.id}
              href={`/dashboard/servicos/${v.servico.id}`}
              className="block text-sm px-3 py-2 rounded-lg bg-blue-50 text-blue-900 hover:opacity-90"
            >
              <span className="font-medium">{v.tecnico.nome}</span> em atendimento — {v.servico.codigo} desde {formatHora(v.inicioEm)}
            </Link>
          ))}
        </div>
      )}

      {dados.aguardandoCheckin.length > 0 && (
        <div className="space-y-2">
          {dados.aguardandoCheckin.map((s) => (
            <Link
              key={s.id}
              href={`/dashboard/servicos/${s.id}`}
              className="block text-sm px-3 py-2 rounded-lg bg-yellow-50 text-yellow-900 hover:opacity-90"
            >
              {s.tecnico?.nome ?? "Sem técnico"} ainda não chegou — {s.codigo}
              {s.dataAgendamento && ` (agendado ${formatHora(s.dataAgendamento)})`}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
