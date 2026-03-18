"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { STATUS_LIST } from "@/lib/status";

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

const IMAGE_FILE_RE = /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|webp)$/i;

function isImageFileName(name: string): boolean {
  return IMAGE_FILE_RE.test(name);
}

function getStatusBadgeClass(status: string): string {
  if (status === "CONCLUIDO") return "bg-gray-200 text-gray-700";
  if (status === "CANCELADO") return "bg-red-100 text-red-800";
  return "bg-secondary/20 text-white";
}

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
  const [draggingFotos, setDraggingFotos] = useState(false);
  const [draggingOrcamento, setDraggingOrcamento] = useState(false);
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

  async function uploadFiles(files: File[]) {
    if (!files.length || !servico) return;
    setUploadingImg(true);
    const formData = new FormData();
    files.forEach((f) => formData.append("file", f));
    const token = typeof window !== "undefined" ? localStorage.getItem("si_token") : null;
    const res = await fetch(`/api/servicos/${id}/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    setUploadingImg(false);
    if (res.ok) load();
  }

  async function handleUploadFotosInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const imageFiles = files.filter((f) => f.type.startsWith("image/") || isImageFileName(f.name));
    await uploadFiles(imageFiles);
  }

  async function handleUploadOrcamentoInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    await uploadFiles(files);
  }

  async function handleDropFotos(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDraggingFotos(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.length) return;
    const imageFiles = files.filter((f) => f.type.startsWith("image/") || isImageFileName(f.name));
    await uploadFiles(imageFiles);
  }

  async function handleDropOrcamento(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDraggingOrcamento(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.length) return;
    await uploadFiles(files);
  }

  if (loading) return <p className="text-body">Carregando…</p>;
  if (!servico) return <p className="text-body">Serviço não encontrado.</p>;

  const timeline = [
    ...servico.statusHist.map((h) => ({ type: "status" as const, ...h })),
    ...servico.notas.map((n) => ({ type: "nota" as const, ...n })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const canChangeStatus = servico.statusAtual !== "CONCLUIDO" && servico.statusAtual !== "CANCELADO";
  const imageUrls = (servico.imagens ?? []).filter((url) => isImageFileName(url));
  const anexoUrls = (servico.imagens ?? []).filter((url) => !isImageFileName(url));

  return (
    <div className="text-theme">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold text-theme-primary">{servico.codigo}</h1>
          <p className="text-body text-gray-600 break-words">
            {servico.cliente.nome} – {servico.categoria?.nome ?? servico.tipoServico ?? "—"}
          </p>
          {servico.dataAgendamento && (
            <p className="text-sm text-white mt-1">Agendado: {new Date(servico.dataAgendamento).toLocaleString("pt-BR")}</p>
          )}
          {servico.valorEstimado != null && (
            <p className="text-sm font-medium mt-1">Valor: R$ {Number(servico.valorEstimado).toLocaleString("pt-BR")}</p>
          )}
        </div>
        <span className={`px-3 py-1 rounded self-start ${getStatusBadgeClass(servico.statusAtual)}`}>
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
              <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                <select value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)} className="px-4 py-2 border rounded-lg flex-1 min-w-[140px] bg-theme-card border-theme text-theme">
                  <option value="">Novo status...</option>
                  {STATUS_LIST.filter((s) => s !== servico.statusAtual).map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
                <button type="submit" disabled={!novoStatus} className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50 w-full sm:w-auto">Atualizar</button>
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
            <button type="submit" disabled={savingEdit} className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50 w-full sm:w-auto">Salvar</button>
          </form>

          <form onSubmit={handleNota} className="bg-theme-card p-4 rounded-lg border border-theme">
            <h2 className="font-heading font-bold text-theme-primary mb-2">Nova nota</h2>
            <textarea value={notaConteudo} onChange={(e) => setNotaConteudo(e.target.value)} className="w-full px-4 py-2 border rounded-lg mb-2 bg-theme-card border-theme text-theme" rows={2} placeholder="Observação..." />
            <label className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={notaVisivel} onChange={(e) => setNotaVisivel(e.target.checked)} />
              Visível ao cliente
            </label>
            <button type="submit" disabled={!notaConteudo.trim()} className="px-4 py-2 bg-secondary text-white rounded-lg disabled:opacity-50 w-full sm:w-auto">Adicionar nota</button>
          </form>

          <div className="bg-theme-card p-4 rounded-lg border border-theme">
            <h2 className="font-heading font-bold text-theme-primary mb-2">Link para o cliente</h2>
            <button type="button" onClick={handleLinkCliente} className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 w-full sm:w-auto">
              Gerar e copiar link
            </button>
            {linkUrl && <p className="mt-2 text-sm text-theme-muted">Copiado!</p>}
          </div>

          <div className="bg-theme-card p-4 rounded-lg border border-theme">
            <h2 className="font-heading font-bold text-theme-primary mb-2">Fotos / imagens</h2>
            {imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {imageUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={url} alt="" className="w-20 h-20 object-cover rounded border" />
                  </a>
                ))}
              </div>
            )}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDraggingFotos(true);
              }}
              onDragLeave={() => setDraggingFotos(false)}
              onDrop={handleDropFotos}
              className={`rounded-lg border border-dashed p-3 transition ${draggingFotos ? "border-primary bg-primary/10" : "border-theme"}`}
            >
              <label className="block">
                <span className="sr-only">Anexar foto</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploadingImg}
                  onChange={handleUploadFotosInput}
                  className="w-full text-sm text-theme-muted file:mr-3 file:rounded-md file:border-0 file:px-4 file:py-2 file:bg-primary file:text-white file:font-medium hover:file:opacity-90"
                />
              </label>
              <p className="text-xs text-theme-muted mt-2">Arraste e solte imagens aqui ou clique em Escolher arquivos.</p>
            </div>
            {uploadingImg && <p className="text-sm text-theme-muted mt-1">Enviando…</p>}
          </div>

          <div className="bg-theme-card p-4 rounded-lg border border-theme">
            <h2 className="font-heading font-bold text-theme-primary mb-2">Anexar orçamento</h2>
            {anexoUrls.length > 0 && (
              <ul className="mb-3 space-y-1 text-sm">
                {anexoUrls.map((url) => {
                  const filename = decodeURIComponent(url.split("/").pop() || "arquivo");
                  return (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white underline break-all"
                      >
                        {filename}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDraggingOrcamento(true);
              }}
              onDragLeave={() => setDraggingOrcamento(false)}
              onDrop={handleDropOrcamento}
              className={`rounded-lg border border-dashed p-3 transition ${draggingOrcamento ? "border-primary bg-primary/10" : "border-theme"}`}
            >
              <label className="block">
                <span className="sr-only">Anexar orçamento</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*"
                  multiple
                  disabled={uploadingImg}
                  onChange={handleUploadOrcamentoInput}
                  className="w-full text-sm text-theme-muted file:mr-3 file:rounded-md file:border-0 file:px-4 file:py-2 file:bg-primary file:text-white file:font-medium hover:file:opacity-90"
                />
              </label>
              <p className="text-xs text-theme-muted mt-2">Arraste e solte arquivos de orçamento aqui ou clique em Escolher arquivos.</p>
            </div>
            {uploadingImg && <p className="text-sm text-theme-muted mt-1">Enviando…</p>}
          </div>
        </div>
      </div>
      {error && <p className="text-red-600 mt-4">{error}</p>}
    </div>
  );
}
