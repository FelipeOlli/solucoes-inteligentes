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
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

  async function handleExcluir() {
    if (!selected) return;
    if (!confirm(`Excluir a obrigação "${selected.nome}"? Esta ação não poderá ser desfeita.`)) return;
    setError("");
    const { status } = await api(`/contabilidade/obrigacoes/${selected.id}`, { method: "DELETE" });
    if (status === 401) { router.push("/login"); return; }
    if (status === 200) {
      setSelectedId(null);
      load();
    } else {
      setError("Não foi possível excluir a obrigação.");
    }
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
    <div className="text-ink space-y-4">
      <PageHeader
        title="Contabilidade"
        description="Controle impostos, tarifas, certificados, boletos, comprovantes e vencimentos em um só lugar."
      />

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard title="Vencendo" value={cards.vencendo} delay={0} />
        <StatCard title="Vencido" value={cards.vencido} delay={80} />
        <StatCard title="Concluídas" value={cards.concluidas} delay={160} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova obrigação</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid gap-2 md:grid-cols-5">
            <Input
              className="md:col-span-2"
              placeholder="Nome da obrigação"
              value={form.nome}
              onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
              required
            />
            <Select
              value={form.tipo}
              onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value as TipoObrigacaoContabil }))}
            >
              {Object.values(TipoObrigacaoContabil).map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </Select>
            <Select
              value={form.periodicidade}
              onChange={(e) => setForm((prev) => ({ ...prev, periodicidade: e.target.value as PeriodicidadeObrigacao }))}
            >
              {Object.values(PeriodicidadeObrigacao).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
            <Input
              type="date"
              value={form.proximoVencimento}
              onChange={(e) => setForm((prev) => ({ ...prev, proximoVencimento: e.target.value }))}
              required
            />
            <Input
              className="md:col-span-4"
              placeholder="Observação (opcional)"
              value={form.observacao}
              onChange={(e) => setForm((prev) => ({ ...prev, observacao: e.target.value }))}
            />
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Adicionar obrigação"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="h-fit">
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Select
                
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as StatusObrigacaoContabil | "TODOS")}
              >
                <option value="TODOS">Todos status</option>
                {Object.values(StatusObrigacaoContabil).map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </Select>
              <Select
                
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value as TipoObrigacaoContabil | "TODOS")}
              >
                <option value="TODOS">Todos tipos</option>
                {Object.values(TipoObrigacaoContabil).map((tp) => (
                  <option key={tp} value={tp}>{tp}</option>
                ))}
              </Select>
            </div>
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {loading && <p className="text-sm text-ink-muted">Carregando...</p>}
              {!loading && filtered.length === 0 && <p className="text-sm text-ink-muted">Sem obrigações para os filtros.</p>}
              {filtered.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    "w-full rounded-control border px-3 py-2 text-left transition-colors",
                    selectedId === item.id
                      ? "border-brand bg-brand/10"
                      : "border-line hover:bg-surface-hover"
                  )}
                >
                  <p className="font-medium">{item.nome}</p>
                  <p className="text-xs text-ink-muted">{item.tipo} • {(item.statusCalculado || item.status)}</p>
                  <p className="text-xs">Vence em {new Date(item.proximoVencimento).toLocaleDateString("pt-BR")}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="space-y-4">
            {!selected && <p className="text-sm text-ink-muted">Selecione uma obrigação.</p>}
            {selected && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-heading text-lg font-semibold">{selected.nome}</h2>
                    <p className="text-sm text-ink-muted">
                      {selected.tipo} • {selected.periodicidade} • {(selected.statusCalculado || selected.status)}
                    </p>
                    <p >Próximo vencimento: {new Date(selected.proximoVencimento).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => patchObrigacao(selected.id, { marcarConcluida: true })}
                    >
                      Marcar concluída
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => patchObrigacao(selected.id, { avancarCiclo: true })}
                    >
                      Avançar ciclo
                    </Button>
                    <Button type="button" onClick={syncCalendario}>
                      Vincular ao calendário
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleExcluir}
                      className="text-red-600 hover:bg-red-600/10 hover:text-red-600"
                    >
                      Excluir
                    </Button>
                  </div>
                </div>

                {selected.tipo === TipoObrigacaoContabil.CERTIFICADO_DIGITAL && (
                  <div className="border-amber-500/40 bg-amber-500/10">
                    Atenção ao certificado digital: mantenha os arquivos e a data de vencimento atualizados para evitar indisponibilidade.
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm space-y-1">
                    <span className="text-ink-muted">Atualizar vencimento</span>
                    <Input
                      type="date"
                      defaultValue={new Date(selected.proximoVencimento).toISOString().slice(0, 10)}
                      onBlur={(e) => {
                        if (!e.target.value) return;
                        patchObrigacao(selected.id, { proximoVencimento: e.target.value });
                      }}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-ink-muted">Observação</span>
                    <Input
                      defaultValue={selected.observacao || ""}
                      onBlur={(e) => patchObrigacao(selected.id, { observacao: e.target.value })}
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Documentos</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select id="categoria-doc" >
                      {Object.values(CategoriaDocumentoContabil).map((categoria) => (
                        <option key={categoria} value={categoria}>{categoria}</option>
                      ))}
                    </Select>
                    <label
                      htmlFor="doc-file"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-control border border-line bg-brand px-3 py-2 font-medium text-brand-fg text-sm transition-colors hover:bg-brand-hover"
                    >
                      Escolher arquivo
                    </label>
                    <input
                      id="doc-file"
                      type="file"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const categoriaSelect = document.getElementById("categoria-doc") as HTMLSelectElement | null;
                        const categoria = (categoriaSelect?.value || CategoriaDocumentoContabil.OUTRO) as CategoriaDocumentoContabil;
                        uploadDocumento(file, categoria);
                        e.currentTarget.value = "";
                      }}
                    />
                    {uploading && <span className="text-sm text-ink-muted">Enviando...</span>}
                  </div>
                  <div className="space-y-2">
                    {(selected.documentos || []).map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between gap-2 rounded-control border border-line px-3 py-2">
                        <div>
                          <a href={withBasePath(doc.arquivoUrl)} target="_blank" rel="noreferrer" className="underline">
                            {doc.nomeOriginal}
                          </a>
                          <p className="text-xs text-ink-muted">
                            {doc.categoria} • {new Date(doc.createdAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocumento(doc.id)}
                          className="text-red-600 hover:bg-red-600/10 hover:text-red-600"
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                    {(selected.documentos || []).length === 0 && (
                      <p className="text-sm text-ink-muted">Nenhum boleto/comprovante/certificado anexado.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Comentários</h3>
                  <div className="flex gap-2">
                    <Input
                      className="min-w-0 flex-1"
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder="Explique a situação deste imposto/tarifa..."
                    />
                    <Button type="button" onClick={addComentario}>
                      Salvar
                    </Button>
                  </div>
                  <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                    {(selected.comentarios || []).map((c) => (
                      <div key={c.id} className="rounded-control border border-line px-3 py-2">
                        <p className="text-sm">{c.conteudo}</p>
                        <p className="text-xs text-ink-muted">
                          {c.autor.email} • {new Date(c.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    ))}
                    {(selected.comentarios || []).length === 0 && <p className="text-sm text-ink-muted">Sem comentários.</p>}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
