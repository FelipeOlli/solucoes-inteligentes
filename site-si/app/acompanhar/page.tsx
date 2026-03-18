"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { api, setToken } from "@/lib/api";

type Servico = {
  id: string;
  codigo: string;
  tipoServico: string;
  statusAtual: string;
  dataAbertura: string;
  prazoEstimado?: string | null;
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

function AcompanharContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(!!tokenFromUrl);
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (tokenFromUrl) {
      fetch(`/api/auth/session-client?token=${encodeURIComponent(tokenFromUrl)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            setToken(data.token);
            setAuthenticated(true);
            return fetch("/api/clientes/me/servicos", {
              headers: { Authorization: `Bearer ${data.token}` },
            });
          }
          setError("Link inválido ou expirado.");
          setLoading(false);
        })
        .then((res) => {
          if (res?.ok) return res.json();
        })
        .then((data) => {
          if (data) setServicos(data);
          setLoading(false);
        })
        .catch(() => {
          setError("Erro ao validar link.");
          setLoading(false);
        });
    } else {
      const stored = typeof window !== "undefined" && localStorage.getItem("si_token");
      if (stored) {
        setAuthenticated(true);
        api<Servico[]>("/clientes/me/servicos").then(({ data }) => {
          setServicos(data || []);
        }).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
  }, [tokenFromUrl]);

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-brand-white">
        <p className="text-body text-brand-black">Carregando…</p>
      </main>
    );
  }

  if (!authenticated && !tokenFromUrl) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-brand-white">
        <h1 className="font-heading text-2xl font-bold text-primary mb-6">Acompanhe seu atendimento</h1>
        <p className="text-body text-brand-black mb-4 text-center max-w-md">
          Use o link que você recebeu (por e-mail ou WhatsApp) para ver o andamento do seu serviço.
        </p>
        <Link href="/" className="text-primary underline">Voltar ao início</Link>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-brand-white">
        <h1 className="font-heading text-2xl font-bold text-primary mb-6">Acompanhe seu atendimento</h1>
        <p className="text-body text-red-600 mb-4">{error}</p>
        <Link href="/" className="text-primary underline">Voltar ao início</Link>
      </main>
    );
  }

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
        <h2 className="font-heading text-lg sm:text-xl font-bold text-primary mb-4">Seus serviços</h2>
        {servicos.length === 0 ? (
          <p className="text-body text-gray-600">Nenhum serviço encontrado.</p>
        ) : (
          <div className="grid gap-4">
            {servicos.map((s) => (
              <Link
                key={s.id}
                href={`/acompanhar/servicos/${s.id}`}
                className="block p-4 bg-white border rounded-lg shadow-sm hover:shadow transition"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                  <span className="font-semibold text-primary">{s.codigo}</span>
                  <span className={`px-2 py-1 rounded text-sm ${s.statusAtual === "ABERTO" ? "bg-secondary/20 text-white" : "bg-secondary/20 text-primary"}`}>
                    {STATUS_LABEL[s.statusAtual] || s.statusAtual}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1 break-words">{s.tipoServico} – {new Date(s.dataAbertura).toLocaleDateString("pt-BR")}</p>
              </Link>
            ))}
          </div>
        )}
        <Link href="/" className="inline-block mt-6 text-primary underline text-sm">Voltar ao início</Link>
      </div>
    </main>
  );
}

export default function AcompanharPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center p-8"><p className="text-body">Carregando…</p></main>}>
      <AcompanharContent />
    </Suspense>
  );
}
