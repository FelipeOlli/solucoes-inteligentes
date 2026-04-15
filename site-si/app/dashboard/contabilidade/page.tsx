"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CategoriaDocumentoContabil,
  PeriodicidadeObrigacao,
  StatusObrigacaoContabil,
  TipoObrigacaoContabil,
} from "@prisma/client";
import { api, withBasePath } from "@/lib/api";

type Comentario = {
  id: string;
  conteudo: string;
  createdAt: string;
  autor: { email: string };
};

type Documento = {
  id: string;
  categoria: CategoriaDocumentoContabil;
  nomeOriginal: string;
  arquivoUrl: string;
  createdAt: string;
  competenciaRef: string | null;
};

type Obrigacao = {
  id: string;
  nome: string;
  tipo: TipoObrigacaoContabil;
  periodicidade: PeriodicidadeObrigacao;
  proximoVencimento: string;
  status: StatusObrigacaoContabil;
  statusCalculado?: StatusObrigacaoContabil;
  observacao: string | null;
  calendarioEventId: string | null;
  documentos?: Documento[];
  comentarios?: Comentario[];
};

type NewObrigacao = {
  nome: string;
  tipo: TipoObrigacaoContabil;
  periodicidade: PeriodicidadeObrigacao;
  proximoVencimento: string;
  observacao: string;
};

const initialForm: NewObrigacao = {
  nome: "",
  tipo: TipoObrigacaoContabil.OUTRO,
  periodicidade: PeriodicidadeObrigacao.UNICA,
  proximoVencimento: "",
  observacao: "",
};

export default function ContabilidadePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryId = searchParams.get("obrigacaoId");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<NewObrigacao>(initialForm);
  const [error, setError] = useState("");
  const [obrigacoes, setObrigacoes] = useState<Obrigacao[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusObrigacaoContabil | "TODOS">("TODOS");
  const [filtroTipo, setFiltroTipo] = useState<TipoObrigacaoContabil | "TODOS">("TODOS");

  const selected = useMemo(
    () => obrigacoes.find((item) => item.id === selectedId) || null,
    [obrigacoes, selectedId]
  );

  const filtered = useMemo(() => {
    return obrigacoes.filter((item) => {
      if (filtroStatus !== "TODOS" && (item.statusCalculado || item.status) !== filtroStatus) return false;
      if (filtroTipo !== "TODOS" && item.tipo !== filtroTipo) return false;
      return true;
    });
  }, [obrigacoes, filtroStatus, filtroTipo]);

  const cards = useMemo(() => {
    const base = { vencendo: 0, vencido: 0, concluidas: 0 };
    for (const o of obrigacoes) {
      const status = o.statusCalculado || o.status;
      if (status === StatusObrigacaoContabil.VENCENDO) base.vencendo += 1;
      if (status === StatusObrigacaoContabil.VENCIDO) base.vencido += 1;
      if (status === StatusObrigacaoContabil.CONCLUIDO) base.concluidas += 1;
    }
    return base;
  }, [obrigacoes]);

  async function load() {
    setLoading(true);
    setError("");
    const res = await api<Obrigacao[]>("/contabilidade/obrigacoes");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.error) {
      setError(res.error.message);
      setLoading(false);
      return;
    }
    const data = res.data || [];
    setObrigacoes(data);
    const nextSelected = queryId || selectedId || data[0]?.id || null;
    setSelectedId(nextSelected);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (queryId) setSelectedId(queryId);
  }, [queryId]);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await api<Obrigacao>("/contabilidade/obrigacoes", {
      method: "POST",
      body: {
        ...form,
        observacao: form.observacao || null,
      },
    });
    setSaving(false);
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setForm(initialForm);
    await load();
    if (res.data?.id) setSelectedId(res.data.id);
  }

  async function patchObrigacao(id: string, body: Record<string, unknown>) {
    const res = await api<Obrigacao>(`/contabilidade/obrigacoes/${id}`, { method: "PATCH", body });
    if (res.status === 401) {
      router.push("/login");
      return false;
    }
    if (res.error) {
      setError(res.error.message);
      return false;
    }
    await load();
    setSelectedId(id);
    return true;
  }

  async function addComentario() {
    if (!selected || !comentario.trim()) return;
    const res = await api(`/contabilidade/obrigacoes/${selected.id}/comentarios`, {
      method: "POST",
      body: { conteudo: comentario.trim() },
    });
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setComentario("");
    await load();
    setSelectedId(selected.id);
  }

  async function uploadDocumento(file: File, categoria: CategoriaDocumentoContabil) {
    if (!selected) return;
    setUploading(true);
    setError("");
    const token = typeof window !== "undefined" ? localStorage.getItem("si_token") : null;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("categoria", categoria);
    const res = await fetch(withBasePath(`/api/contabilidade/obrigacoes/${selected.id}/upload`), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    setUploading(false);
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.message || "Falha ao enviar arquivo.");
      return;
    }
    await load();
    setSelectedId(selected.id);
  }

  async function removeDocumento(documentId: string) {
    if (!selected) return;
    const res = await api(`/contabilidade/obrigacoes/${selected.id}/upload?documentId=${documentId}`, {
      method: "DELETE",
      body: {},
    });
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.error) {
      setError(res.error.message);
      return;
    }
    await load();
    setSelectedId(selected.id);
  }

  async function syncCalendario() {
    if (!selected) return;
    const res = await api(`/contabilidade/obrigacoes/${selected.id}/sync-calendario`, { method: "POST", body: {} });
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.error) {
      setError(res.error.message);
      return;
    }
    await load();
    setSelectedId(selected.id);
  }

  return (
    <div className="space-y-4 text-theme">
      <div>
        <h1 className="font-heading text-2xl font-bold text-theme-primary">Contabilidade</h1>
        <p className="text-sm text-theme-muted">
          Controle impostos, tarifas, certificados, boletos, comprovantes e vencimentos em um só lugar.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <p className="text-sm text-theme-muted">Vencendo</p>
          <p className="text-2xl font-semibold text-amber-600">{cards.vencendo}</p>
        </div>
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <p className="text-sm text-theme-muted">Vencido</p>
          <p className="text-2xl font-semibold text-red-600">{cards.vencido}</p>
        </div>
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <p className="text-sm text-theme-muted">Concluídas</p>
          <p className="text-2xl font-semibold text-green-600">{cards.concluidas}</p>
        </div>
      </div>

      <form onSubmit={onCreate} className="bg-theme-card border border-theme rounded-lg p-4 grid md:grid-cols-5 gap-2">
        <input
          className="md:col-span-2 px-3 py-2 rounded border border-theme bg-transparent"
          placeholder="Nome da obrigação"
          value={form.nome}
          onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
          required
        />
        <select
          className="px-3 py-2 rounded border border-theme bg-transparent"
          value={form.tipo}
          onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value as TipoObrigacaoContabil }))}
        >
          {Object.values(TipoObrigacaoContabil).map((tipo) => (
            <option key={tipo} value={tipo}>{tipo}</option>
          ))}
        </select>
        <select
          className="px-3 py-2 rounded border border-theme bg-transparent"
          value={form.periodicidade}
          onChange={(e) => setForm((prev) => ({ ...prev, periodicidade: e.target.value as PeriodicidadeObrigacao }))}
        >
          {Object.values(PeriodicidadeObrigacao).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <input
          type="date"
          className="px-3 py-2 rounded border border-theme bg-transparent"
          value={form.proximoVencimento}
          onChange={(e) => setForm((prev) => ({ ...prev, proximoVencimento: e.target.value }))}
          required
        />
        <input
          className="md:col-span-4 px-3 py-2 rounded border border-theme bg-transparent"
          placeholder="Observação (opcional)"
          value={form.observacao}
          onChange={(e) => setForm((prev) => ({ ...prev, observacao: e.target.value }))}
        />
        <button
          type="submit"
          className="px-3 py-2 rounded bg-primary text-white disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "Salvando..." : "Adicionar obrigação"}
        </button>
      </form>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-theme-card border border-theme rounded-lg p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              className="px-2 py-2 rounded border border-theme bg-transparent text-sm"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as StatusObrigacaoContabil | "TODOS")}
            >
              <option value="TODOS">Todos status</option>
              {Object.values(StatusObrigacaoContabil).map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
            <select
              className="px-2 py-2 rounded border border-theme bg-transparent text-sm"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as TipoObrigacaoContabil | "TODOS")}
            >
              <option value="TODOS">Todos tipos</option>
              {Object.values(TipoObrigacaoContabil).map((tp) => (
                <option key={tp} value={tp}>{tp}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {loading && <p className="text-sm text-theme-muted">Carregando...</p>}
            {!loading && filtered.length === 0 && <p className="text-sm text-theme-muted">Sem obrigações para os filtros.</p>}
            {filtered.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`w-full text-left rounded-lg border px-3 py-2 ${selectedId === item.id ? "border-primary" : "border-theme"}`}
              >
                <p className="font-medium">{item.nome}</p>
                <p className="text-xs text-theme-muted">{item.tipo} • {(item.statusCalculado || item.status)}</p>
                <p className="text-xs">Vence em {new Date(item.proximoVencimento).toLocaleDateString("pt-BR")}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 bg-theme-card border border-theme rounded-lg p-4 space-y-4">
          {!selected && <p className="text-sm text-theme-muted">Selecione uma obrigação.</p>}
          {selected && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-heading text-lg font-semibold text-theme-primary">{selected.nome}</h2>
                  <p className="text-sm text-theme-muted">
                    {selected.tipo} • {selected.periodicidade} • {(selected.statusCalculado || selected.status)}
                  </p>
                  <p className="text-sm">Próximo vencimento: {new Date(selected.proximoVencimento).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="px-3 py-2 rounded border border-theme"
                    onClick={() => patchObrigacao(selected.id, { marcarConcluida: true })}
                  >
                    Marcar concluída
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 rounded border border-theme"
                    onClick={() => patchObrigacao(selected.id, { avancarCiclo: true })}
                  >
                    Avançar ciclo
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 rounded bg-primary text-white"
                    onClick={syncCalendario}
                  >
                    Vincular ao calendário
                  </button>
                </div>
              </div>

              {selected.tipo === TipoObrigacaoContabil.CERTIFICADO_DIGITAL && (
                <div className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                  Atenção ao certificado digital: mantenha os arquivos e a data de vencimento atualizados para evitar indisponibilidade.
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-3">
                <label className="text-sm space-y-1">
                  <span className="text-theme-muted">Atualizar vencimento</span>
                  <input
                    type="date"
                    defaultValue={new Date(selected.proximoVencimento).toISOString().slice(0, 10)}
                    className="w-full px-3 py-2 rounded border border-theme bg-transparent"
                    onBlur={(e) => {
                      if (!e.target.value) return;
                      patchObrigacao(selected.id, { proximoVencimento: e.target.value });
                    }}
                  />
                </label>
                <label className="text-sm space-y-1">
                  <span className="text-theme-muted">Observação</span>
                  <input
                    defaultValue={selected.observacao || ""}
                    className="w-full px-3 py-2 rounded border border-theme bg-transparent"
                    onBlur={(e) => patchObrigacao(selected.id, { observacao: e.target.value })}
                  />
                </label>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Documentos</h3>
                <div className="flex flex-wrap gap-2 items-center">
                  <select id="categoria-doc" className="px-2 py-2 rounded border border-theme bg-transparent text-sm">
                    {Object.values(CategoriaDocumentoContabil).map((categoria) => (
                      <option key={categoria} value={categoria}>{categoria}</option>
                    ))}
                  </select>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const categoriaSelect = document.getElementById("categoria-doc") as HTMLSelectElement | null;
                      const categoria = (categoriaSelect?.value || CategoriaDocumentoContabil.OUTRO) as CategoriaDocumentoContabil;
                      uploadDocumento(file, categoria);
                      e.currentTarget.value = "";
                    }}
                  />
                  {uploading && <span className="text-sm text-theme-muted">Enviando...</span>}
                </div>
                <div className="space-y-2">
                  {(selected.documentos || []).map((doc) => (
                    <div key={doc.id} className="rounded border border-theme px-3 py-2 flex items-center justify-between gap-2">
                      <div>
                        <a href={withBasePath(doc.arquivoUrl)} target="_blank" rel="noreferrer" className="underline">
                          {doc.nomeOriginal}
                        </a>
                        <p className="text-xs text-theme-muted">
                          {doc.categoria} • {new Date(doc.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-red-600 text-sm"
                        onClick={() => removeDocumento(doc.id)}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                  {(selected.documentos || []).length === 0 && (
                    <p className="text-sm text-theme-muted">Nenhum boleto/comprovante/certificado anexado.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Comentários</h3>
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-2 rounded border border-theme bg-transparent"
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder="Explique a situação deste imposto/tarifa..."
                  />
                  <button type="button" className="px-3 py-2 rounded bg-primary text-white" onClick={addComentario}>
                    Salvar
                  </button>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {(selected.comentarios || []).map((c) => (
                    <div key={c.id} className="rounded border border-theme px-3 py-2">
                      <p className="text-sm">{c.conteudo}</p>
                      <p className="text-xs text-theme-muted">
                        {c.autor.email} • {new Date(c.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  ))}
                  {(selected.comentarios || []).length === 0 && <p className="text-sm text-theme-muted">Sem comentários.</p>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
