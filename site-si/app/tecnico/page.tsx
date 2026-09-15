"use client";

import { useEffect, useState, useCallback } from "react";
import { api, withBasePath } from "@/lib/api";
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
  dataReagendamentoProposta: string | null;
  motivoReagendamento: string | null;
  comprovanteRepasseUrl: string | null;
  comprovanteRepasseNomeArquivo: string | null;
  comprovantesMaterial: string[];
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
  { id: "concluidos", label: "Concluídos" },
] as const;

export default function TecnicoPage() {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["id"]>("abertos");
  const [servicos, setServicos] = useState<ServicoTecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [acaoPendenteId, setAcaoPendenteId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [concluindoId, setConcluindoId] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");
  const [reagendandoId, setReagendandoId] = useState<string | null>(null);
  const [novaData, setNovaData] = useState("");
  const [motivoReagendamento, setMotivoReagendamento] = useState("");
  const [enviandoMaterialId, setEnviandoMaterialId] = useState<string | null>(null);

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

  async function handleReagendar(id: string) {
    if (!novaData || !motivoReagendamento.trim()) return;
    setAcaoPendenteId(id);
    const { error } = await api(`/tecnicos/me/servicos/${id}/reagendar`, {
      method: "POST",
      body: { novaData: new Date(novaData).toISOString(), comentario: motivoReagendamento },
    });
    setAcaoPendenteId(null);
    if (error) {
      alert(error.message);
      return;
    }
    setReagendandoId(null);
    setNovaData("");
    setMotivoReagendamento("");
    carregar();
  }

  async function uploadComprovantesMaterial(id: string, files: FileList | null) {
    if (!files || !files.length) return;
    setEnviandoMaterialId(id);
    setErro("");
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("file", f));
    const token = typeof window !== "undefined" ? localStorage.getItem("si_token") : null;
    const res = await fetch(withBasePath(`/api/tecnicos/me/servicos/${id}/comprovantes-material`), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    setEnviandoMaterialId(null);
    if (res.ok) {
      carregar();
    } else {
      const j = await res.json().catch(() => ({}));
      setErro(typeof (j as { message?: string }).message === "string" ? (j as { message: string }).message : "Não foi possível enviar o comprovante.");
    }
  }

  async function removerComprovanteMaterial(id: string, url: string) {
    if (!confirm("Remover este comprovante?")) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("si_token") : null;
    const res = await fetch(
      withBasePath(`/api/tecnicos/me/servicos/${id}/comprovantes-material?url=${encodeURIComponent(url)}`),
      { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (res.ok) carregar();
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

              {s.statusAtual !== "CONCLUIDO" && s.statusAtual !== "CANCELADO" && (
                <div className="mb-3 pb-3 border-b border-theme">
                  <p className="text-sm font-medium text-theme mb-1">Comprovantes de material</p>
                  {s.comprovantesMaterial.length > 0 && (
                    <ul className="space-y-1 mb-2">
                      {s.comprovantesMaterial.map((url) => (
                        <li key={url} className="flex items-center gap-2 text-sm">
                          <a
                            href={withBasePath(url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-theme-primary underline truncate"
                          >
                            {url.split("/").pop()}
                          </a>
                          <button
                            type="button"
                            onClick={() => removerComprovanteMaterial(s.id, url)}
                            className="text-red-600 text-xs underline shrink-0"
                          >
                            Remover
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="inline-block text-sm underline cursor-pointer text-theme-primary">
                    {enviandoMaterialId === s.id ? "Enviando…" : "+ Anexar comprovante de peça/material"}
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      multiple
                      className="hidden"
                      disabled={enviandoMaterialId === s.id}
                      onChange={(e) => {
                        uploadComprovantesMaterial(s.id, e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              )}

              {s.statusAtual === "AGUARDANDO_CONFIRMACAO" && (
                <p className="text-sm text-theme-muted italic">Aguardando a gestão confirmar a conclusão.</p>
              )}

              {s.statusAtual === "CONCLUIDO" && s.comprovanteRepasseUrl && (
                <a
                  href={withBasePath(s.comprovanteRepasseUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm text-theme-primary underline"
                >
                  Ver comprovante do pagamento
                </a>
              )}

              {s.statusAtual === "AGUARDANDO_REAGENDAMENTO" && (
                <p className="text-sm text-theme-muted italic">
                  Aguardando a gestão aprovar o reagendamento
                  {s.dataReagendamentoProposta && <> para {formatDataHora(s.dataReagendamentoProposta)}</>}.
                </p>
              )}

              {s.statusAtual !== "CONCLUIDO" &&
                s.statusAtual !== "CANCELADO" &&
                s.statusAtual !== "AGUARDANDO_CONFIRMACAO" &&
                s.statusAtual !== "AGUARDANDO_REAGENDAMENTO" && (
                <div className="flex flex-col gap-2">
                  {s.statusAtual === "EM_ANDAMENTO" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={acaoPendenteId === s.id}
                        onClick={() => { setReagendandoId(s.id); setNovaData(""); setMotivoReagendamento(""); }}
                        className="flex-1 py-2 rounded-lg font-medium border border-theme text-theme disabled:opacity-50"
                      >
                        Reagendar
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

              {reagendandoId === s.id && (
                <div className="mt-3 pt-3 border-t border-theme">
                  <label className="block text-sm font-medium text-theme mb-1">
                    Nova data/hora <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={novaData}
                    onChange={(e) => setNovaData(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-2 border rounded-lg bg-theme-card border-theme text-theme text-sm mb-2"
                  />
                  <label className="block text-sm font-medium text-theme mb-1">
                    Motivo <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={motivoReagendamento}
                    onChange={(e) => setMotivoReagendamento(e.target.value)}
                    rows={3}
                    placeholder="Ex.: cliente não estava no endereço, remarcamos por telefone"
                    className="w-full px-3 py-2 border rounded-lg bg-theme-card border-theme text-theme text-sm mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setReagendandoId(null); setNovaData(""); setMotivoReagendamento(""); }}
                      className="flex-1 py-2 rounded-lg font-medium border border-theme text-theme"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!novaData || !motivoReagendamento.trim() || acaoPendenteId === s.id}
                      onClick={() => handleReagendar(s.id)}
                      className="flex-1 py-2 rounded-lg font-medium bg-theme-cta disabled:opacity-50"
                    >
                      {acaoPendenteId === s.id ? "Enviando…" : "Enviar para aprovação"}
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
