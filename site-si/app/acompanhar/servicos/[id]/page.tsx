"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  ABERTO: "Aberto",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_PECA: "Aguardando peça",
  AGUARDANDO_CLIENTE: "Aguardando cliente",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

type TimelineItem =
  | { type: "status"; id: string; statusAnterior: string | null; statusNovo: string; createdAt: string }
  | { type: "nota"; id: string; conteudo: string; createdAt: string };

type ServicoCliente = {
  id: string;
  codigo: string;
  tipoServico: string;
  descricao: string;
  statusAtual: string;
  dataAbertura: string;
  prazoEstimado?: string | null;
  timeline: TimelineItem[];
};

export default function AcompanharServicoPage() {
  const params = useParams();
  const id = params.id as string;
  const [servico, setServico] = useState<ServicoCliente | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ServicoCliente>(`/clientes/me/servicos/${id}`).then(({ data, status }) => {
      if (status === 404 || status === 403) setServico(null);
      else setServico(data || null);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-body p-8">Carregando…</p>;
  if (!servico) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-body text-gray-600">Serviço não encontrado.</p>
        <Link href="/acompanhar" className="text-primary underline mt-4 inline-block">← Voltar aos meus serviços</Link>
      </main>
    );
  }

  const sorted = [...servico.timeline].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Image
            src="/logo/logo-branco.svg"
            alt="Soluções Inteligentes"
            width={180}
            height={18}
            className="h-7 w-auto mb-1"
          />
          <p className="text-sm opacity-90">Acompanhe seu atendimento</p>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link href="/acompanhar" className="text-primary underline text-sm mb-4 inline-block">← Voltar aos meus serviços</Link>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="font-heading text-2xl font-bold text-primary">{servico.codigo}</h2>
            <p className="text-body text-gray-600">{servico.tipoServico}</p>
          </div>
          <span className={`px-3 py-1 rounded ${servico.statusAtual === "CONCLUIDO" ? "bg-gray-200" : servico.statusAtual === "CANCELADO" ? "bg-red-100 text-red-800" : "bg-secondary/20 text-primary"}`}>
            {STATUS_LABEL[servico.statusAtual]}
          </span>
        </div>
        {servico.descricao && <p className="text-body text-gray-700 mb-6">{servico.descricao}</p>}
        <h3 className="font-heading font-bold text-primary mb-3">Linha do tempo</h3>
        <ul className="space-y-3">
          {sorted.map((item) => (
            <li key={item.id} className="text-sm border-l-2 border-primary pl-3 bg-white p-3 rounded-r">
              <span className="text-gray-500 block">{new Date(item.createdAt).toLocaleString("pt-BR")}</span>
              {item.type === "status" ? (
                <p>
                  {item.statusAnterior
                    ? `Status: ${STATUS_LABEL[item.statusAnterior]} → ${STATUS_LABEL[item.statusNovo]}`
                    : `Abertura: ${STATUS_LABEL[item.statusNovo]}`}
                </p>
              ) : (
                <p>{item.conteudo}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
