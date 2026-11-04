"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    <Card className="mb-6 p-5">
      <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-semibold text-ink">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        Ao vivo
      </h2>

      {dados.emAndamento.length > 0 && (
        <div className="mb-3 space-y-2">
          {dados.emAndamento.map((v) => (
            <Link
              key={v.id}
              href={`/dashboard/servicos/${v.servico.id}`}
              className="block rounded-control bg-surface-hover px-3 py-2.5 text-sm text-ink transition-colors hover:bg-brand/10"
            >
              <span className="font-medium">{v.tecnico.nome}</span> em atendimento —{" "}
              {v.servico.codigo} desde {formatHora(v.inicioEm)}
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
              className={cn(
                "block rounded-control bg-warn-bg px-3 py-2.5 text-sm text-warn transition-colors hover:bg-warn-bg/70"
              )}
            >
              {s.tecnico?.nome ?? "Sem técnico"} ainda não chegou — {s.codigo}
              {s.dataAgendamento && ` (agendado ${formatHora(s.dataAgendamento)})`}
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
