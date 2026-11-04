"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ArtigoCard, type Artigo } from "./ArtigoCard";
import { ArtigoDrawer } from "./ArtigoDrawer";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const CATEGORIAS = ["DAS", "PGDAS-D", "DARF", "IRPF", "Certificado Digital", "Contrato", "Geral", "Outro"];

export function BaseConhecimento() {
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [selecionado, setSelecionado] = useState<Artigo | null>(null);
  const [drawerMode, setDrawerMode] = useState<"view" | "edit" | "new">("view");
  const [erro, setErro] = useState("");

  async function carregar(q = busca, cat = filtroCategoria) {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cat) params.set("categoria", cat);
    const { data } = await api<Artigo[]>(`/contabilidade/conhecimento?${params}`);
    if (data) setArtigos(data);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  const handleBusca = useCallback((q: string) => {
    setBusca(q);
    carregar(q, filtroCategoria);
  }, [filtroCategoria]);

  const handleCategoria = (cat: string) => {
    setFiltroCategoria(cat);
    carregar(busca, cat);
  };

  function handleSalvo(artigo: Artigo) {
    setArtigos((prev) => {
      const idx = prev.findIndex((a) => a.id === artigo.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = artigo;
        return next;
      }
      return [artigo, ...prev];
    });
    setSelecionado(artigo);
    setDrawerMode("view");
  }

  function handleExcluido(id: string) {
    setArtigos((prev) => prev.filter((a) => a.id !== id));
    setSelecionado(null);
  }

  function abrirNovo() {
    setSelecionado(null);
    setDrawerMode("new");
  }

  function abrirArtigo(artigo: Artigo) {
    setSelecionado(artigo);
    setDrawerMode("view");
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          type="search"
          placeholder="Buscar artigos..."
          value={busca}
          onChange={(e) => handleBusca(e.target.value)}
          className="min-w-[180px] flex-1"
        />
        <Select
          value={filtroCategoria}
          onChange={(e) => handleCategoria(e.target.value)}
          className="shrink-0"
        >
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <button
          type="button"
          onClick={abrirNovo}
          className="px-4 rounded bg-brand text-brand-fg shrink-0"
        >
          + Novo artigo
        </button>
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      {loading ? (
        <div className="bg-surface border border-line rounded-card p-8 text-center text-sm text-ink-muted">
          Carregando...
        </div>
      ) : artigos.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <p className="text-ink-muted text-sm">Nenhum artigo encontrado.</p>
          <button
            type="button"
            onClick={abrirNovo}
            className="text-sm text-brand hover:underline"
          >
            Criar o primeiro artigo
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {artigos.map((a) => (
            <ArtigoCard key={a.id} artigo={a} onClick={() => abrirArtigo(a)} />
          ))}
        </div>
      )}

      {(selecionado || drawerMode === "new") && (
        <ArtigoDrawer
          artigo={selecionado}
          mode={drawerMode}
          onClose={() => { setSelecionado(null); setDrawerMode("view"); }}
          onSalvo={handleSalvo}
          onExcluido={handleExcluido}
        />
      )}
    </div>
  );
}
