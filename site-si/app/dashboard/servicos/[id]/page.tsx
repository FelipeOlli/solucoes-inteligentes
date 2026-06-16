"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api, withBasePath } from "@/lib/api";
import { STATUS_LIST } from "@/lib/status";
import { calcularLucroReal, taxaPorPagamento } from "@/lib/lucro";

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

const FORMA_PAGAMENTO_LABEL: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  CREDITO: "Crédito",
  DEBITO: "Débito",
};

const IMAGE_FILE_RE = /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|webp)$/i;
const VIDEO_FILE_RE = /\.(mp4|mov|webm|m4v|ogv|ogg|3gp|avi|mkv)$/i;

function isImageFileName(urlOrName: string): boolean {
  const pathOnly = urlOrName.split("?")[0];
  return IMAGE_FILE_RE.test(pathOnly);
}

function isVideoFileName(urlOrName: string): boolean {
  const pathOnly = urlOrName.split("?")[0];
  return VIDEO_FILE_RE.test(pathOnly);
}

function getStatusBadgeClass(status: string): string {
  if (status === "CONCLUIDO") return "bg-green-100 text-green-800";
  if (status === "CANCELADO") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
}

function formatCampoHist(campo: string, anterior: string | null, novo: string | null): string {
  const label: Record<string, string> = {
    dataAgendamento: "Data de agendamento",
    valor: "Valor estimado",
    categoria: "Categoria",
    formaPagamento: "Forma de pagamento",
    tecnico: "Técnico responsável",
    convidado: "Convidado",
  };
  const l = label[campo] ?? campo;

  if (campo === "dataAgendamento") {
    const fmtDate = (v: string | null) => v ? new Date(v).toLocaleString("pt-BR") : "—";
    if (!anterior) return `${l} definida: ${fmtDate(novo)}`;
    if (!novo) return `${l} removida (era ${fmtDate(anterior)})`;
    return `${l}: ${fmtDate(anterior)} → ${fmtDate(novo)}`;
  }
  if (campo === "valor") {
    const fmtVal = (v: string | null) => v != null ? `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—";
    if (!anterior) return `${l} definido: ${fmtVal(novo)}`;
    if (!novo) return `${l} removido`;
    return `${l}: ${fmtVal(anterior)} → ${fmtVal(novo)}`;
  }
  if (campo === "formaPagamento") {
    const fmt = (v: string | null) => v ? (FORMA_PAGAMENTO_LABEL[v] ?? v) : "—";
    if (!anterior) return `${l} definida: ${fmt(novo)}`;
    if (!novo) return `${l} removida`;
    return `${l}: ${fmt(anterior)} → ${fmt(novo)}`;
  }
  if (campo === "convidado") {
    if (!anterior) return `Convidado adicionado: ${novo}`;
    if (!novo) return "Convidado removido";
    return `Convidado alterado: ${anterior} → ${novo}`;
  }
  // categoria, tecnico
  if (!anterior) return `${l} definido: ${novo ?? "—"}`;
  if (!novo) return `${l} removido`;
  return `${l}: ${anterior} → ${novo}`;
}

type Categoria = { id: string; nome: string };
type Tecnico = { id: string; nome: string; email?: string | null };
type CampoHistItem = { id: string; campo: string; valorAnterior: string | null; valorNovo: string | null; createdAt: string };

type ServicoDetail = {
  id: string;
  codigo: string;
  tipoServico: string | null;
  categoria: Categoria | null;
  tecnico: Tecnico | null;
  descricao: string;
  statusAtual: string;
  dataAbertura: string;
  dataAgendamento?: string | null;
  dataConclusao?: string | null;
  prazoEstimado?: string | null;
  valorEstimado?: number | null;
  valorRepasse?: number | null;
  valorMaterial?: number | null;
  imagens?: string[] | null;
  formaPagamento?: string | null;
  convidadoEmail?: string | null;
  cliente: { nome: string; email: string; telefone: string };
  statusHist: { id: string; statusAnterior: string | null; statusNovo: string; idAutor: string; createdAt: string }[];
  notas: { id: string; conteudo: string; visivelCliente: boolean; createdAt: string }[];
  campoHist: CampoHistItem[];
};

type PatchBody = {
  data_agendamento?: string | null;
  valor_estimado?: number | null;
  valor_repasse?: number | null;
  valor_material?: number | null;
  categoria_id?: string | null;
  forma_pagamento?: string | null;
  tecnico_id?: string | null;
  convidado_email?: string | null;
  data_conclusao?: string | null;
};

function localDateIso(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

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
  const [removingUrl, setRemovingUrl] = useState<string | null>(null);
  const [draggingFotos, setDraggingFotos] = useState(false);
  const [draggingOrcamento, setDraggingOrcamento] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [editDataAgendamento, setEditDataAgendamento] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editCategoriaId, setEditCategoriaId] = useState("");
  const [editFormaPagamento, setEditFormaPagamento] = useState("");
  const [editTecnicoId, setEditTecnicoId] = useState("");
  const [editValorRepasse, setEditValorRepasse] = useState("");
  const [editValorMaterial, setEditValorMaterial] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");

  // Modal conclusão/cancelamento
  const [showModalConclusao, setShowModalConclusao] = useState(false);
  const [dataConclusaoInput, setDataConclusaoInput] = useState("");
  const [editDataConclusao, setEditDataConclusao] = useState("");

  // Modal exclusão
  const [showModalExcluir, setShowModalExcluir] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Modal convidado
  const [showModalConvidado, setShowModalConvidado] = useState(false);
  const [pendingBody, setPendingBody] = useState<PatchBody | null>(null);
  const [convidadoTipo, setConvidadoTipo] = useState<"sem" | "tecnico" | "outro">("sem");
  const [convidadoTecnicoEmail, setConvidadoTecnicoEmail] = useState("");
  const [convidadoOutroEmail, setConvidadoOutroEmail] = useState("");

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
    setEditValorRepasse(servico.valorRepasse != null ? String(servico.valorRepasse) : "");
    setEditValorMaterial(servico.valorMaterial != null ? String(servico.valorMaterial) : "");
    setEditCategoriaId(servico.categoria?.id ?? "");
    setEditFormaPagamento(servico.formaPagamento ?? "");
    setEditTecnicoId(servico.tecnico?.id ?? "");
    setNovoStatus(servico.statusAtual);
    setEditDataConclusao(servico.dataConclusao ? new Date(servico.dataConclusao).toISOString().slice(0, 10) : "");
  }, [servico?.id, servico?.dataAgendamento, servico?.valorEstimado, servico?.categoria?.id, servico?.statusAtual, servico?.formaPagamento, servico?.dataConclusao]);

  useEffect(() => {
    api<Categoria[]>("/categorias").then(({ data }) => data && setCategorias(data));
    api<Tecnico[]>("/tecnicos").then(({ data }) => data && setTecnicos(data));
  }, []);

  async function executarSalvar(body: PatchBody) {
    setSavingEdit(true);
    const { status } = await api(`/servicos/${id}`, { method: "PATCH", body });
    setSavingEdit(false);
    if (status === 401) router.push("/login");
    if (status === 200) load();
  }

  function buildBody(): PatchBody {
    const body: PatchBody = {
      data_agendamento: editDataAgendamento ? new Date(editDataAgendamento).toISOString() : null,
      valor_estimado: editValor.trim() ? Number(editValor.trim().replace(",", ".")) || null : null,
      valor_repasse: editValorRepasse.trim() ? Number(editValorRepasse.trim().replace(",", ".")) || null : null,
      valor_material: editValorMaterial.trim() ? Number(editValorMaterial.trim().replace(",", ".")) || null : null,
      categoria_id: editCategoriaId || null,
      forma_pagamento: editFormaPagamento || null,
      tecnico_id: editTecnicoId || null,
    };
    if (servico && (servico.statusAtual === "CONCLUIDO" || servico.statusAtual === "CANCELADO") && editDataConclusao) {
      body.data_conclusao = localDateIso(editDataConclusao);
    }
    return body;
  }

  async function handleSalvarDados(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const originalData = servico?.dataAgendamento
      ? new Date(servico.dataAgendamento).toISOString().slice(0, 16)
      : "";
    const dataMudou = editDataAgendamento !== "" && editDataAgendamento !== originalData;

    if (dataMudou) {
      // Reset modal state and open
      setConvidadoTipo("sem");
      setConvidadoTecnicoEmail("");
      setConvidadoOutroEmail("");
      setPendingBody(buildBody());
      setShowModalConvidado(true);
      return;
    }

    await executarSalvar(buildBody());
  }

  async function handleExcluir() {
    setDeleting(true);
    const { status } = await api(`/servicos/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (status === 401) { router.push("/login"); return; }
    if (status === 200) router.push("/dashboard");
  }

  async function handleConfirmarConvidado() {
    if (!pendingBody) return;
    let email: string | null = null;
    if (convidadoTipo === "tecnico") email = convidadoTecnicoEmail || null;
    else if (convidadoTipo === "outro") email = convidadoOutroEmail.trim() || null;
    setShowModalConvidado(false);
    await executarSalvar({ ...pendingBody, convidado_email: email });
    setPendingBody(null);
  }

  async function handleStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!novoStatus || novoStatus === servico?.statusAtual) return;
    setStatusError("");
    if (novoStatus === "CONCLUIDO" || novoStatus === "CANCELADO") {
      setDataConclusaoInput(new Date().toISOString().slice(0, 10));
      setShowModalConclusao(true);
      return;
    }
    const { status, error: err } = await api(`/servicos/${id}/status`, { method: "PATCH", body: { status_novo: novoStatus } });
    if (status === 401) router.push("/login");
    if (status === 200) {
      setStatusError("");
      load();
    } else {
      setStatusError(err?.message ?? "Não foi possível atualizar o status.");
    }
  }

  async function handleConfirmarConclusao() {
    setShowModalConclusao(false);
    const body: { status_novo: string; data_conclusao?: string } = { status_novo: novoStatus };
    if (dataConclusaoInput) body.data_conclusao = localDateIso(dataConclusaoInput);
    const { status, error: err } = await api(`/servicos/${id}/status`, { method: "PATCH", body });
    if (status === 401) router.push("/login");
    if (status === 200) { setStatusError(""); load(); }
    else setStatusError(err?.message ?? "Não foi possível atualizar o status.");
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
    const res = await fetch(withBasePath(`/api/servicos/${id}/upload`), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    setUploadingImg(false);
    if (res.ok) load();
  }

  async function removeAttachment(urlToRemove: string) {
    if (!servico || removingUrl) return;
    setRemovingUrl(urlToRemove);
    setError("");
    const token = typeof window !== "undefined" ? localStorage.getItem("si_token") : null;
    const res = await fetch(
      withBasePath(`/api/servicos/${id}/upload?url=${encodeURIComponent(urlToRemove)}`),
      { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    setRemovingUrl(null);
    if (res.status === 401) router.push("/login");
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(typeof (j as { message?: string }).message === "string" ? (j as { message: string }).message : "Não foi possível remover o arquivo.");
      return;
    }
    load();
  }

  async function handleUploadFotosInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const mediaFiles = files.filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
           || isImageFileName(f.name) || isVideoFileName(f.name)
    );
    await uploadFiles(mediaFiles);
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
    const mediaFiles = files.filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
           || isImageFileName(f.name) || isVideoFileName(f.name)
    );
    await uploadFiles(mediaFiles);
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

  const descricaoLinha =
    servico.descricao.trim() !== ""
      ? [
          {
            type: "descricao" as const,
            id: `${servico.id}-descricao`,
            conteudo: servico.descricao,
            createdAt: servico.dataAbertura,
          },
        ]
      : [];
  const timeline = [
    ...descricaoLinha,
    ...servico.statusHist.map((h) => ({ type: "status" as const, ...h })),
    ...servico.notas.map((n) => ({ type: "nota" as const, ...n })),
    ...(servico.campoHist ?? []).map((c) => ({ type: "campo" as const, ...c })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const mediaUrls = (servico.imagens ?? []).filter((url) => isImageFileName(url) || isVideoFileName(url));
  const anexoUrls = (servico.imagens ?? []).filter((url) => !isImageFileName(url) && !isVideoFileName(url));
  const tecnicosComEmail = tecnicos.filter((t) => t.email);

  return (
    <div className="text-theme">
      {/* Modal de exclusão */}
      {showModalExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-theme-card rounded-lg border border-theme p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-heading font-bold text-theme-primary text-lg mb-2">Excluir serviço</h2>
            <p className="text-sm text-theme-muted mb-5">
              Esta ação é irreversível. O serviço <span className="font-medium text-theme">{servico.codigo}</span> e todos os seus dados serão excluídos permanentemente.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowModalExcluir(false)}
                disabled={deleting}
                className="px-4 py-2 border border-theme rounded-lg text-sm text-theme-muted hover:opacity-80 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExcluir}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {deleting ? "Excluindo…" : "Excluir permanentemente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de data de conclusão/cancelamento */}
      {showModalConclusao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-theme-card rounded-lg border border-theme p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-heading font-bold text-theme-primary text-lg mb-2">
              {novoStatus === "CONCLUIDO" ? "Data de conclusão" : "Data de cancelamento"}
            </h2>
            <p className="text-sm text-theme-muted mb-4">
              Qual foi a data real em que o serviço foi {novoStatus === "CONCLUIDO" ? "concluído" : "cancelado"}?
            </p>
            <input
              type="date"
              value={dataConclusaoInput}
              onChange={(e) => setDataConclusaoInput(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowModalConclusao(false)}
                className="px-4 py-2 border border-theme rounded-lg text-sm text-theme-muted hover:opacity-80"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmarConclusao}
                disabled={!dataConclusaoInput}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de convidado */}
      {showModalConvidado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-theme-card rounded-lg border border-theme p-6 w-full max-w-md shadow-xl">
            <h2 className="font-heading font-bold text-theme-primary text-lg mb-1">Convidado para o agendamento</h2>
            <p className="text-sm text-theme-muted mb-4">Haverá algum convidado neste agendamento? O convidado receberá um convite pelo Google Calendar.</p>

            <div className="space-y-3 mb-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="convidado" value="sem" checked={convidadoTipo === "sem"} onChange={() => setConvidadoTipo("sem")} />
                <span className="text-sm">Sem convidado</span>
              </label>

              {tecnicosComEmail.length > 0 && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" name="convidado" value="tecnico" checked={convidadoTipo === "tecnico"} onChange={() => setConvidadoTipo("tecnico")} className="mt-1" />
                  <div className="flex-1">
                    <span className="text-sm">Técnico cadastrado</span>
                    {convidadoTipo === "tecnico" && (
                      <select
                        value={convidadoTecnicoEmail}
                        onChange={(e) => setConvidadoTecnicoEmail(e.target.value)}
                        className="mt-2 w-full px-3 py-2 border rounded-lg bg-theme-card border-theme text-theme text-sm"
                        autoFocus
                      >
                        <option value="">Selecionar técnico…</option>
                        {tecnicosComEmail.map((t) => (
                          <option key={t.id} value={t.email!}>{t.nome} ({t.email})</option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>
              )}

              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="convidado" value="outro" checked={convidadoTipo === "outro"} onChange={() => setConvidadoTipo("outro")} className="mt-1" />
                <div className="flex-1">
                  <span className="text-sm">Outro email</span>
                  {convidadoTipo === "outro" && (
                    <input
                      type="email"
                      value={convidadoOutroEmail}
                      onChange={(e) => setConvidadoOutroEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="mt-2 w-full px-3 py-2 border rounded-lg bg-theme-card border-theme text-theme text-sm"
                      autoFocus
                    />
                  )}
                </div>
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowModalConvidado(false); setPendingBody(null); }}
                className="px-4 py-2 border border-theme rounded-lg text-sm text-theme-muted hover:opacity-80"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarConvidado}
                disabled={savingEdit || (convidadoTipo === "tecnico" && !convidadoTecnicoEmail) || (convidadoTipo === "outro" && !convidadoOutroEmail.trim())}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50"
              >
                {savingEdit ? "Salvando…" : "Confirmar e salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold text-theme-primary">{servico.codigo}</h1>
          <p className="text-body text-gray-600 break-words">
            {servico.cliente.nome} – {servico.categoria?.nome ?? servico.tipoServico ?? "—"}
          </p>
          {servico.dataAgendamento && (
            <p className="text-sm text-white mt-1">Agendado: {new Date(servico.dataAgendamento).toLocaleString("pt-BR")}</p>
          )}
          {servico.valorEstimado != null && (
            <p className="text-sm font-medium mt-1">Valor cobrado: R$ {Number(servico.valorEstimado).toLocaleString("pt-BR")}</p>
          )}
        </div>
        <div className="flex items-start gap-2 self-start">
          <span className={`px-3 py-1 rounded ${getStatusBadgeClass(servico.statusAtual)}`}>
            {STATUS_LABEL[servico.statusAtual]}
          </span>
          <button
            type="button"
            onClick={() => setShowModalExcluir(true)}
            className="px-3 py-1 rounded border border-red-300 text-red-600 text-sm hover:bg-red-50 transition"
          >
            Excluir
          </button>
        </div>
      </div>

      {/* Card de lucro real — visível quando há valor cobrado */}
      {servico.valorEstimado != null && (() => {
        const lucro = calcularLucroReal({
          valorEstimado: servico.valorEstimado,
          valorRepasse: servico.valorRepasse,
          valorMaterial: servico.valorMaterial,
          formaPagamento: servico.formaPagamento,
        });
        const taxa = taxaPorPagamento(servico.formaPagamento);
        const taxaValor = servico.valorEstimado * taxa / 100;
        const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        return (
          <div className="bg-theme-card border border-theme rounded-xl p-4 mb-6">
            <h2 className="font-heading font-semibold text-theme-primary text-sm mb-3">Composição do lucro</h2>
            <div className="flex flex-wrap gap-4 text-sm items-center">
              <span>Receita <strong>{fmt(servico.valorEstimado)}</strong></span>
              {(servico.valorRepasse ?? 0) > 0 && (
                <span className="text-red-400">− Repasse <strong>{fmt(servico.valorRepasse!)}</strong></span>
              )}
              {(servico.valorMaterial ?? 0) > 0 && (
                <span className="text-orange-400">− Material <strong>{fmt(servico.valorMaterial!)}</strong></span>
              )}
              {taxaValor > 0 && (
                <span className="text-yellow-500">− Taxa ({taxa.toFixed(2)}%) <strong>{fmt(taxaValor)}</strong></span>
              )}
              <span className={`font-bold text-base border-l border-theme pl-4 ${(lucro ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                = Lucro {lucro != null ? fmt(lucro) : "—"}
              </span>
            </div>
          </div>
        );
      })()}

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
                ) : item.type === "descricao" ? (
                  <>
                    <span className="text-theme-muted">{new Date(item.createdAt).toLocaleString("pt-BR")}</span>
                    <p className="text-xs font-medium text-theme-muted mb-1">Descrição do serviço</p>
                    <p className="whitespace-pre-wrap break-words">{(item as { conteudo: string }).conteudo}</p>
                  </>
                ) : item.type === "campo" ? (
                  <>
                    <span className="text-theme-muted">{new Date(item.createdAt).toLocaleString("pt-BR")}</span>
                    <p>{formatCampoHist(
                      (item as CampoHistItem).campo,
                      (item as CampoHistItem).valorAnterior,
                      (item as CampoHistItem).valorNovo
                    )}</p>
                  </>
                ) : (
                  <>
                    <span className="text-theme-muted">{new Date(item.createdAt).toLocaleString("pt-BR")}</span>
                    <p className="whitespace-pre-wrap break-words">{(item as { conteudo: string }).conteudo}</p>
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
          <form onSubmit={handleStatus} className="bg-theme-card p-4 rounded-lg border border-theme">
            <h2 className="font-heading font-bold text-theme-primary mb-2">Alterar status</h2>
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
              <select value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)} className="px-4 py-2 border rounded-lg flex-1 min-w-[140px] bg-theme-card border-theme text-theme">
                <option value="">Novo status...</option>
                {STATUS_LIST.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!novoStatus || novoStatus === servico.statusAtual}
                className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50 w-full sm:w-auto"
              >
                Atualizar
              </button>
            </div>
            {statusError && <p className="text-red-600 text-sm mt-2">{statusError}</p>}
          </form>

          <form onSubmit={handleSalvarDados} className="bg-theme-card p-4 rounded-lg border border-theme">
            <h2 className="font-heading font-bold text-theme-primary mb-2">Dados do serviço</h2>
            <div className="space-y-2 mb-3">
              <label className="block text-sm font-medium text-theme-muted">Data de agendamento</label>
              <input type="datetime-local" value={editDataAgendamento} onChange={(e) => setEditDataAgendamento(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme" />
            </div>
            <div className="space-y-2 mb-3">
              <label className="block text-sm font-medium text-theme-muted">Valor cobrado (R$)</label>
              <input type="text" value={editValor} onChange={(e) => setEditValor(e.target.value)} placeholder="0,00" className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme" />
            </div>
            <div className="space-y-2 mb-3">
              <label className="block text-sm font-medium text-theme-muted">Repasse ao técnico (R$)</label>
              <input
                type="text"
                value={editValorRepasse}
                onChange={(e) => setEditValorRepasse(e.target.value)}
                placeholder="0,00 (deixe vazio se executou você mesmo)"
                className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
              />
            </div>
            <div className="space-y-2 mb-3">
              <label className="block text-sm font-medium text-theme-muted">Material gasto (R$)</label>
              <input
                type="text"
                value={editValorMaterial}
                onChange={(e) => setEditValorMaterial(e.target.value)}
                placeholder="0,00 (peças, insumos, etc.)"
                className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
              />
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
            <div className="space-y-2 mb-3">
              <label className="block text-sm font-medium text-theme-muted">Forma de pagamento</label>
              <select
                value={editFormaPagamento}
                onChange={(e) => setEditFormaPagamento(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
              >
                <option value="">—</option>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="PIX">PIX</option>
                <option value="CREDITO">Crédito</option>
                <option value="DEBITO">Débito</option>
              </select>
            </div>
            <div className="space-y-2 mb-3">
              <label className="block text-sm font-medium text-theme-muted">Técnico responsável</label>
              <select
                value={editTecnicoId}
                onChange={(e) => setEditTecnicoId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
              >
                <option value="">— Sem técnico —</option>
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
            {(servico.statusAtual === "CONCLUIDO" || servico.statusAtual === "CANCELADO") && (
              <div className="space-y-2 mb-3">
                <label className="block text-sm font-medium text-theme-muted">
                  Data de {servico.statusAtual === "CONCLUIDO" ? "conclusão" : "cancelamento"}
                </label>
                <input
                  type="date"
                  value={editDataConclusao}
                  onChange={(e) => setEditDataConclusao(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
                />
              </div>
            )}
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
            <h2 className="font-heading font-bold text-theme-primary mb-2">Fotos / imagens / vídeos</h2>
            {mediaUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {mediaUrls.map((url) => {
                  const href = withBasePath(url);
                  return (
                    <div key={url} className="relative group shrink-0">
                      {isVideoFileName(url) ? (
                        <video src={href} controls className="w-20 h-20 object-cover rounded border border-theme" />
                      ) : (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={href} alt="" className="w-20 h-20 object-cover rounded border border-theme" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => removeAttachment(url)}
                        disabled={removingUrl === url}
                        className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold shadow hover:opacity-90 disabled:opacity-50"
                        title="Remover"
                        aria-label="Remover"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
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
                  accept="image/*,video/*"
                  multiple
                  disabled={uploadingImg}
                  onChange={handleUploadFotosInput}
                  className="w-full text-sm text-theme-muted file:mr-3 file:rounded-md file:border-0 file:px-4 file:py-2 file:bg-primary file:text-white file:font-medium hover:file:opacity-90"
                />
              </label>
              <p className="text-xs text-theme-muted mt-2">Arraste e solte imagens ou vídeos aqui ou clique em Escolher arquivos.</p>
            </div>
            {uploadingImg && <p className="text-sm text-theme-muted mt-1">Enviando…</p>}
          </div>

          <div className="bg-theme-card p-4 rounded-lg border border-theme">
            <h2 className="font-heading font-bold text-theme-primary mb-2">Anexar Documentos</h2>
            {anexoUrls.length > 0 && (
              <ul className="mb-3 space-y-1 text-sm">
                {anexoUrls.map((url) => {
                  const filename = decodeURIComponent(url.split("/").pop() || "arquivo");
                  return (
                    <li key={url} className="flex flex-wrap items-center gap-2">
                      <a
                        href={withBasePath(url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white underline break-all"
                      >
                        {filename}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeAttachment(url)}
                        disabled={removingUrl === url}
                        className="text-xs text-red-400 hover:underline disabled:opacity-50"
                      >
                        Remover
                      </button>
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
                <span className="sr-only">Anexar Documentos</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*"
                  multiple
                  disabled={uploadingImg}
                  onChange={handleUploadOrcamentoInput}
                  className="w-full text-sm text-theme-muted file:mr-3 file:rounded-md file:border-0 file:px-4 file:py-2 file:bg-primary file:text-white file:font-medium hover:file:opacity-90"
                />
              </label>
              <p className="text-xs text-theme-muted mt-2">Arraste e solte arquivos aqui ou clique em Escolher arquivos.</p>
            </div>
            {uploadingImg && <p className="text-sm text-theme-muted mt-1">Enviando…</p>}
          </div>
        </div>
      </div>
      {error && <p className="text-red-600 mt-4">{error}</p>}
    </div>
  );
}
