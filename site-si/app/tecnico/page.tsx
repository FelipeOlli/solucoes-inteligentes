"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { brl } from "@/lib/format";
import { STATUS_LABEL, getStatusBadgeClass } from "@/lib/status";

type ServicoTecnico = {
  id: string;
  codigo: string;
  descricao: string;
  tipoServico: string | null;
  statusAtual: string;
  dataAbertura: string;
  dataAgendamento: string | null;
  prazoEstimado: string | null;
  dataConclusao: string | null;
  enderecoServico: string | null;
  contatoPreferencial: string | null;
  valorRepasse: number | null;
  categoria: string | null;
  cliente: { nome: string; nomeContato: string | null; telefone: string | null };
};

function formatDataHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const FILTROS = [
  { id: "abertos", label: "Em aberto" },
  { id: "hoje", label: "Hoje" },
  { id: "semana", label: "Semana" },
] as const;

export default function TecnicoPage() {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["id"]>("abertos");
  const [servicos, setServicos] = useState<ServicoTecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [acaoPendenteId, setAcaoPendenteId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [concluindoId, setConcluindoId] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");

  const carregar = useCallback(() => {
    setLoading(true);
    api<ServicoTecnico[]>(`/tecnicos/me/servicos?filtro=${filtro}`).then(({ data, error }) => {
      if (error) setErro(error.message);
      else {
        setErro("");
        setServicos(data ?? []);
      }
      setLoading(false);
    });
  }, [filtro]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleCheckin(id: string) {
    setAcaoPendenteId(id);
    const { error } = await api(`/tecnicos/me/servicos/${id}/checkin`, { method: "POST" });
    setAcaoPendenteId(null);
    if (error) {
      alert(error.message);
      return;
    }
    carregar();
  }

  async function handleCheckout(id: string) {
    setAcaoPendenteId(id);
    const { error } = await api(`/tecnicos/me/servicos/${id}/checkout`, { method: "POST" });
    setAcaoPendenteId(null);
    if (error) {
      alert(error.message);
      return;
    }
    carregar();
  }

  async function handleConcluir(id: string) {
    if (!comentario.trim()) return;
    setAcaoPendenteId(id);
    const { error } = await api(`/tecnicos/me/servicos/${id}/concluir`, {
      method: "POST",
      body: { comentario },
    });
    setAcaoPendenteId(null);
    if (error) {
      alert(error.message);
      return;
    }
    setConcluindoId(null);
    setComentario("");
    carregar();
  }

  return (
    <div>
      <h1 className="font-heading text-xl font-bold text-theme-primary mb-4">Meus serviços</h1>

      <div className="flex gap-2 mb-4">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
              filtro === f.id ? "bg-primary text-white border-primary" : "text-theme border-theme"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {erro && <p className="text-red-600 mb-4">{erro}</p>}
      {loading ? (
        <p className="text-body text-theme-muted">Carregando…</p>
      ) : servicos.length === 0 ? (
        <p className="text-body text-theme-muted">Nenhum serviço nesse filtro.</p>
      ) : (
        <div className="space-y-3">
          {servicos.map((s) => (
            <div key={s.id} className="bg-theme-card p-4 rounded-lg border border-theme">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-heading font-bold text-theme-primary">{s.codigo}</p>
                  <p className="text-sm text-theme-muted">{s.cliente.nome}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusBadgeClass(s.statusAtual)}`}>
                  {STATUS_LABEL[s.statusAtual] ?? s.statusAtual}
                </span>
              </div>

              <p className="text-body text-theme mb-2">{s.descricao}</p>

              <dl className="text-sm text-theme-muted space-y-1 mb-3">
                {s.enderecoServico && (
                  <div>
                    <dt className="inline font-medium text-theme">Endereço: </dt>
                    <dd className="inline">{s.enderecoServico}</dd>
                  </div>
                )}
                {(s.cliente.telefone || s.contatoPreferencial) && (
                  <div>
                    <dt className="inline font-medium text-theme">Contato: </dt>
                    <dd className="inline">{s.contatoPreferencial || s.cliente.telefone}</dd>
                  </div>
                )}
                {s.dataAgendamento && (
                  <div>
                    <dt className="inline font-medium text-theme">Agendado: </dt>
                    <dd className="inline">{formatDataHora(s.dataAgendamento)}</dd>
                  </div>
                )}
                {s.valorRepasse != null && (
                  <div>
                    <dt className="inline font-medium text-theme">Seu repasse: </dt>
                    <dd className="inline">{brl(s.valorRepasse)}</dd>
                  </div>
                )}
              </dl>

              {s.statusAtual === "AGUARDANDO_CONFIRMACAO" && (
                <p className="text-sm text-theme-muted italic">Aguardando o dono confirmar a conclusão.</p>
              )}

              {s.statusAtual !== "CONCLUIDO" && s.statusAtual !== "CANCELADO" && s.statusAtual !== "AGUARDANDO_CONFIRMACAO" && (
                <div className="flex flex-col gap-2">
                  {s.statusAtual === "EM_ANDAMENTO" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={acaoPendenteId === s.id}
                        onClick={() => handleCheckout(s.id)}
                        className="flex-1 py-2 rounded-lg font-medium border border-theme text-theme disabled:opacity-50"
                      >
                        {acaoPendenteId === s.id ? "Registrando…" : "Sair sem concluir"}
                      </button>
                      <button
                        type="button"
                        disabled={acaoPendenteId === s.id}
                        onClick={() => { setConcluindoId(s.id); setComentario(""); }}
                        className="flex-1 py-2 rounded-lg font-medium bg-theme-cta disabled:opacity-50"
                      >
                        Concluir atendimento
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={acaoPendenteId === s.id}
                      onClick={() => handleCheckin(s.id)}
                      className="flex-1 py-2 rounded-lg font-medium bg-theme-cta disabled:opacity-50"
                    >
                      {acaoPendenteId === s.id ? "Registrando…" : "Cheguei / iniciar atendimento"}
                    </button>
                  )}
                </div>
              )}

              {concluindoId === s.id && (
                <div className="mt-3 pt-3 border-t border-theme">
                  <label className="block text-sm font-medium text-theme mb-1">
                    O que foi feito? <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    rows={3}
                    autoFocus
                    placeholder="Ex.: troquei a placa-mãe, testei e o cliente aprovou"
                    className="w-full px-3 py-2 border rounded-lg bg-theme-card border-theme text-theme text-sm mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setConcluindoId(null); setComentario(""); }}
                      className="flex-1 py-2 rounded-lg font-medium border border-theme text-theme"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!comentario.trim() || acaoPendenteId === s.id}
                      onClick={() => handleConcluir(s.id)}
                      className="flex-1 py-2 rounded-lg font-medium bg-theme-cta disabled:opacity-50"
                    >
                      {acaoPendenteId === s.id ? "Enviando…" : "Enviar para confirmação"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
