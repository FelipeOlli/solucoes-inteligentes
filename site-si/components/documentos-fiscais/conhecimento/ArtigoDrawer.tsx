"use client";

import { useEffect, useRef, useState } from "react";
import { api, withBasePath } from "@/lib/api";
import type { Artigo, Anexo } from "./ArtigoCard";

type Mode = "view" | "edit" | "new";

type Props = {
  artigo: Artigo | null;
  mode: Mode;
  onClose: () => void;
  onSalvo: (artigo: Artigo) => void;
  onExcluido: (id: string) => void;
};

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

const CATEGORIAS = ["DAS", "PGDAS-D", "DARF", "IRPF", "Certificado Digital", "Contrato", "Geral", "Outro"];

export function ArtigoDrawer({ artigo, mode: initialMode, onClose, onSalvo, onExcluido }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [uploadAndo, setUploadAndo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (artigo) {
      setTitulo(artigo.titulo);
      setCategoria(artigo.categoria ?? "");
      setDescricao(artigo.descricao ?? "");
      setConteudo(artigo.conteudo);
      setAnexos(artigo.anexos);
    } else {
      setTitulo("");
      setCategoria("");
      setDescricao("");
      setConteudo("");
      setAnexos([]);
    }
    setMode(initialMode);
    setErro("");
  }, [artigo?.id, initialMode]);

  async function salvar() {
    if (!titulo.trim()) { setErro("Título obrigatório."); return; }
    setSalvando(true);
    setErro("");

    const body = { titulo, categoria, descricao, conteudo };

    if (mode === "new") {
      const { data, status } = await api<Artigo>("/contabilidade/conhecimento", { method: "POST", body });
      if (status === 201 && data) { onSalvo({ ...data, anexos }); }
      else setErro("Erro ao criar artigo.");
    } else if (artigo) {
      const { data, status } = await api<Artigo>(`/contabilidade/conhecimento/${artigo.id}`, { method: "PATCH", body });
      if (status === 200 && data) { onSalvo(data); setMode("view"); }
      else setErro("Erro ao salvar.");
    }
    setSalvando(false);
  }

  async function excluir() {
    if (!artigo || !confirm("Excluir este artigo?")) return;
    const { status } = await api(`/contabilidade/conhecimento/${artigo.id}`, { method: "DELETE" });
    if (status === 200) onExcluido(artigo.id);
    else setErro("Erro ao excluir.");
  }

  async function uploadAnexo(file: File) {
    if (!artigo) return;
    setUploadAndo(true);
    const form = new FormData();
    form.append("file", file);
    const token = typeof window !== "undefined" ? localStorage.getItem("si_token") : null;
    const url = withBasePath(`/api/contabilidade/conhecimento/${artigo.id}/anexos`);
    const res = await fetch(url, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (res.status === 201) {
      const data: Anexo = await res.json();
      setAnexos((prev) => [...prev, data]);
    } else {
      setErro("Erro ao enviar anexo.");
    }
    setUploadAndo(false);
  }

  async function removerAnexo(anexo: Anexo) {
    if (!artigo || !confirm("Remover anexo?")) return;
    const { status } = await api(`/contabilidade/conhecimento/${artigo.id}/anexos/${anexo.id}`, { method: "DELETE" });
    if (status === 200) setAnexos((prev) => prev.filter((a) => a.id !== anexo.id));
    else setErro("Erro ao remover anexo.");
  }

  const isEditing = mode === "edit" || mode === "new";

  if (!artigo && mode !== "new") return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 h-full w-full max-w-2xl bg-theme-bg border-l border-theme z-50 flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme shrink-0">
          <h2 className="font-heading font-bold text-lg text-theme-primary truncate">
            {mode === "new" ? "Novo artigo" : isEditing ? "Editar artigo" : artigo?.titulo}
          </h2>
          <div className="flex items-center gap-2">
            {mode === "view" && (
              <>
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  className="px-3 py-1.5 text-sm rounded border border-theme hover:border-primary text-theme transition-colors"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={excluir}
                  className="px-3 py-1.5 text-sm rounded border border-red-400 text-red-500 hover:bg-red-50 transition-colors"
                >
                  Excluir
                </button>
              </>
            )}
            <button type="button" onClick={onClose} className="text-theme-muted hover:text-theme text-xl leading-none px-1">×</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{erro}</p>}

          {isEditing ? (
            <>
              <div className="space-y-1">
                <label className="text-xs text-theme-muted font-medium">Título *</label>
                <input
                  className="w-full rounded border border-theme bg-theme-card px-3 py-2 text-sm text-theme focus:outline-none focus:border-primary"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex.: Como emitir o DAS"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-theme-muted font-medium">Categoria</label>
                  <select
                    className="w-full rounded border border-theme bg-theme-card px-3 py-2 text-sm text-theme focus:outline-none focus:border-primary"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                  >
                    <option value="">— Nenhuma —</option>
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-theme-muted font-medium">Resumo</label>
                  <input
                    className="w-full rounded border border-theme bg-theme-card px-3 py-2 text-sm text-theme focus:outline-none focus:border-primary"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Breve descrição"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-theme-muted font-medium">Conteúdo / Passo-a-passo</label>
                <textarea
                  className="w-full rounded border border-theme bg-theme-card px-3 py-2 text-sm text-theme focus:outline-none focus:border-primary font-mono resize-none"
                  rows={16}
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  placeholder={"1. Acesse o PGDAS-D\n2. Selecione a competência\n3. ..."}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 items-center">
                {artigo?.categoria && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {artigo.categoria}
                  </span>
                )}
                {artigo?.descricao && (
                  <span className="text-sm text-theme-muted">{artigo.descricao}</span>
                )}
              </div>

              {artigo?.conteudo ? (
                <div className="bg-theme-card border border-theme rounded-lg p-4 text-sm text-theme whitespace-pre-wrap leading-relaxed font-mono">
                  {artigo.conteudo}
                </div>
              ) : (
                <p className="text-sm text-theme-muted italic">Sem conteúdo.</p>
              )}
            </>
          )}

          {/* Anexos — visível no view e edit (não em new antes de salvar) */}
          {mode !== "new" && artigo && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-theme-muted font-medium uppercase tracking-wide">Anexos</p>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadAndo}
                    className="text-xs px-2 py-1 rounded border border-theme hover:border-primary transition-colors disabled:opacity-50"
                  >
                    {uploadAndo ? "Enviando..." : "+ Adicionar"}
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAnexo(f); e.target.value = ""; }}
              />
              {anexos.length === 0 ? (
                <p className="text-xs text-theme-muted italic">Nenhum anexo.</p>
              ) : (
                <ul className="space-y-1">
                  {anexos.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 bg-theme-card border border-theme rounded px-3 py-2">
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1">
                        📎 {a.nomeArquivo}
                      </a>
                      <span className="text-xs text-theme-muted shrink-0">{formatBytes(a.tamanhoBytes)}</span>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => removerAnexo(a)}
                          className="text-red-400 hover:text-red-600 text-xs shrink-0"
                        >
                          ✕
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {isEditing && (
          <div className="px-6 py-4 border-t border-theme shrink-0 flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { if (mode === "new") onClose(); else setMode("view"); }}
              className="px-4 py-2 text-sm rounded border border-theme hover:border-primary text-theme transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="px-4 py-2 text-sm rounded bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
