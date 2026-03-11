"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { STATUS_LIST } from "@/lib/status";

const STATUS_LABEL: Record<string, string> = {
  ABERTO: "Aberto",
  AGENDADO: "Agendado",
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_PECA: "Aguardando peça",
  AGUARDANDO_CLIENTE: "Aguardando cliente",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

type Categoria = { id: string; nome: string };

type ServicoDetail = {
  id: string;
  codigo: string;
  tipoServico: string | null;
  categoria: Categoria | null;
  descricao: string;
  statusAtual: string;
  dataAbertura: string;
  dataAgendamento?: string | null;
  dataConclusao?: string | null;
  prazoEstimado?: string | null;
  valorEstimado?: number | null;
  imagens?: string[] | null;
  cliente: { nome: string; email: string; telefone: string };
  statusHist: { id: string; statusAnterior: string | null; statusNovo: string; idAutor: string; createdAt: string }[];
  notas: { id: string; conteudo: string; visivelCliente: boolean; createdAt: string }[];
};

export default function ServicoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [servico, setServico] = useState<ServicoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [novoStatus, setNovoStatus] = useState("");
  const [notaConteudo, setNotaConteudo] = useState("");
  const [notaVisivel, setNotaVisivel] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [editDataAgendamento, setEditDataAgendamento] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editCategoriaId, setEditCategoriaId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState("");

  function load() {
    api<ServicoDetail>(`/servicos/${id}`).then(({ data, status }) => {
      if (status === 401) router.push("/login");
      if (status === 404) setServico(null);
      else setServico(data || null);
    }).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (!servico) return;
    setEditDataAgendamento(servico.dataAgendamento ? new Date(servico.dataAgendamento).toISOString().slice(0, 16) : "");
    setEditValor(servico.valorEstimado != null ? String(servico.valorEstimado) : "");
    setEditCategoriaId(servico.categoria?.id ?? "");
  }, [servico?.id, servico?.dataAgendamento, servico?.valorEstimado, servico?.categoria?.id]);

  useEffect(() => {
    api<Categoria[]>("/categorias").then(({ data }) => data && setCategorias(data));
  }, []);

  async function handleSalvarDados(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSavingEdit(true);
    const body: { data_agendamento?: string | null; valor_estimado?: number | null; categoria_id?: string | null } = {};
    body.data_agendamento = editDataAgendamento ? new Date(editDataAgendamento).toISOString() : null;
    body.valor_estimado = editValor.trim() ? Number(editValor.trim().replace(",", ".")) || null : null;
    body.categoria_id = editCategoriaId || null;
    const { status } = await api(`/servicos/${id}`, { method: "PATCH", body });
    setSavingEdit(false);
    if (status === 401) router.push("/login");
    if (status === 200) load();
  }

  async function handleStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!novoStatus) return;
    setError("");
    const { status } = await api(`/servicos/${id}/status`, { method: "PATCH", body: { status_novo: novoStatus } });
    if (status === 401) router.push("/login");
    if (status === 200) {
      setNovoStatus("");
      load();
    } else {
      setError("Transição não permitida.");
    }
  }

  async function handleNota(e: React.FormEvent) {
    e.preventDefault();
    if (!notaConteudo.trim()) return;
    setError("");
    const { status } = await api(`/servicos/${id}/notas`, {
      method: "POST",
      body: { conteudo: notaConteudo.trim(), visivel_cliente: notaVisivel },
    });
    if (status === 401) router.push("/login");
    if (status === 201) {
      setNotaConteudo("");
      setNotaVisivel(false);
      load();
    }
  }

  async function handleLinkCliente() {
    const { data } = await api<{ url: string }>(`/servicos/${id}/link-cliente`);
    if (data?.url) {
      setLinkUrl(data.url);
      await navigator.clipboard.writeText(data.url);
    }
  }

  async function handleUploadImagens(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length || !servico) return;
    setUploadingImg(true);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("file", f));
    const token = typeof window !== "undefined" ? localStorage.getItem("si_token") : null;
    const res = await fetch(`/api/servicos/${id}/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    setUploadingImg(false);
    e.target.value = "";
    if (res.ok) load();
  }

  if (loading) return <p className="text-body">Carregando…</p>;
  if (!servico) return <p className="text-body">Serviço não encontrado.</p>;

  const timeline = [
    ...servico.statusHist.map((h) => ({ type: "status" as const, ...h })),
    ...servico.notas.map((n) => ({ type: "nota" as const, ...n })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const canChangeStatus = servico.statusAtual !== "CONCLUIDO" && servico.statusAtual !== "CANCELADO";

  return (
    <div className="text-theme">
      <Link href="/dashboard" className="text-theme-primary underline text-sm mb-4 inline-block">← Voltar aos serviços</Link>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-theme-primary">{servico.codigo}</h1>
          <p className="text-body text-gray-600">
            {servico.cliente.nome} – {servico.categoria?.nome ?? servico.tipoServico ?? "—"}
          </p>
          {servico.dataAgendamento && (
            <p className="text-sm text-primary mt-1">Agendado: {new Date(servico.dataAgendamento).toLocaleString("pt-BR")}</p>
          )}
          {servico.valorEstimado != null && (
            <p className="text-sm font-medium mt-1">Valor: R$ {Number(servico.valorEstimado).toLocaleString("pt-BR")}</p>
          )}
        </div>
        <span className={`px-3 py-1 rounded ${servico.statusAtual === "CONCLUIDO" ? "bg-gray-200" : servico.statusAtual === "CANCELADO" ? "bg-red-100" : "bg-secondary/20 text-primary"}`}>
          {STATUS_LABEL[servico.statusAtual]}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-theme-card p-4 rounded-lg border border-theme text-theme">
          <h2 className="font-heading font-bold text-theme-primary mb-2">Linha do tempo</h2>
          <ul className="space-y-3">
            {timeline.map((item) => (
              <li key={item.id} className="text-sm border-l-2 border-primary pl-3">
                {item.type === "status" ? (
                  <>
                    <span className="text-theme-muted">{new Date(item.createdAt).toLocaleString("pt-BR")}</span>
                    <p>
                      {(item as { statusAnterior: string | null }).statusAnterior
                        ? `Status: ${STATUS_LABEL[(item as { statusAnterior: string }).statusAnterior]} → ${STATUS_LABEL[(item as { statusNovo: string }).statusNovo]}`
                        : `Abertura: ${STATUS_LABEL[(item as { statusNovo: string }).statusNovo]}`}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-theme-muted">{new Date(item.createdAt).toLocaleString("pt-BR")}</span>
                    <p>{(item as { conteudo: string }).conteudo}</p>
                    {(item as { visivelCliente: boolean }).visivelCliente && (
                      <span className="text-xs text-secondary">(visível ao cliente)</span>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          {canChangeStatus && (
            <form onSubmit={handleStatus} className="bg-theme-card p-4 rounded-lg border border-theme">
              <h2 className="font-heading font-bold text-theme-primary mb-2">Alterar status</h2>
              <div className="flex gap-2 flex-wrap">
                <select value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)} className="px-4 py-2 border rounded-lg flex-1 min-w-[140px] bg-theme-card border-theme text-theme">
                  <option value="">Novo status...</option>
                  {STATUS_LIST.filter((s) => s !== servico.statusAtual).map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
                <button type="submit" disabled={!novoStatus} className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50">Atualizar</button>
              </div>
            </form>
          )}

          <form onSubmit={handleSalvarDados} className="bg-theme-card p-4 rounded-lg border border-theme">
            <h2 className="font-heading font-bold text-theme-primary mb-2">Dados do serviço</h2>
            <div className="space-y-2 mb-3">
              <label className="block text-sm font-medium text-theme-muted">Data de agendamento</label>
              <input type="datetime-local" value={editDataAgendamento} onChange={(e) => setEditDataAgendamento(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme" />
            </div>
            <div className="space-y-2 mb-3">
              <label className="block text-sm font-medium text-theme-muted">Valor (R$)</label>
              <input type="text" value={editValor} onChange={(e) => setEditValor(e.target.value)} placeholder="0,00" className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme" />
            </div>
            <div className="space-y-2 mb-3">
              <label className="block text-sm font-medium text-theme-muted">Categoria</label>
              <select value={editCategoriaId} onChange={(e) => setEditCategoriaId(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme">
                <option value="">—</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={savingEdit} className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50">Salvar</button>
          </form>

          <form onSubmit={handleNota} className="bg-theme-card p-4 rounded-lg border border-theme">
            <h2 className="font-heading font-bold text-theme-primary mb-2">Nova nota</h2>
            <textarea value={notaConteudo} onChange={(e) => setNotaConteudo(e.target.value)} className="w-full px-4 py-2 border rounded-lg mb-2 bg-theme-card border-theme text-theme" rows={2} placeholder="Observação..." />
            <label className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={notaVisivel} onChange={(e) => setNotaVisivel(e.target.checked)} />
              Visível ao cliente
            </label>
            <button type="submit" disabled={!notaConteudo.trim()} className="px-4 py-2 bg-secondary text-white rounded-lg disabled:opacity-50">Adicionar nota</button>
          </form>

          <div className="bg-theme-card p-4 rounded-lg border border-theme">
            <h2 className="font-heading font-bold text-theme-primary mb-2">Link para o cliente</h2>
            <button type="button" onClick={handleLinkCliente} className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90">
              Gerar e copiar link
            </button>
            {linkUrl && <p className="mt-2 text-sm text-theme-muted">Copiado!</p>}
          </div>

          <div className="bg-theme-card p-4 rounded-lg border border-theme">
            <h2 className="font-heading font-bold text-theme-primary mb-2">Fotos / imagens</h2>
            {servico.imagens && servico.imagens.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {servico.imagens.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={url} alt="" className="w-20 h-20 object-cover rounded border" />
                  </a>
                ))}
              </div>
            )}
            <label className="block">
              <span className="sr-only">Anexar foto</span>
              <input type="file" accept="image/*" multiple disabled={uploadingImg} onChange={handleUploadImagens} className="w-full text-sm" />
            </label>
            {uploadingImg && <p className="text-sm text-theme-muted mt-1">Enviando…</p>}
          </div>
        </div>
      </div>
      {error && <p className="text-red-600 mt-4">{error}</p>}
    </div>
  );
}
