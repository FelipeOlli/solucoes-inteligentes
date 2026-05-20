"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ArtigoCard, type Artigo } from "./ArtigoCard";
import { ArtigoDrawer } from "./ArtigoDrawer";

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
        <input
          type="search"
          placeholder="Buscar artigos..."
          value={busca}
          onChange={(e) => handleBusca(e.target.value)}
          className="flex-1 min-w-[180px] rounded border border-theme bg-theme-card px-3 py-2 text-sm text-theme focus:outline-none focus:border-primary"
        />
        <select
          value={filtroCategoria}
          onChange={(e) => handleCategoria(e.target.value)}
          className="px-3 py-2 rounded border border-theme bg-theme-card text-sm text-theme shrink-0"
        >
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          type="button"
          onClick={abrirNovo}
          className="px-4 py-2 rounded bg-primary text-white text-sm shrink-0"
        >
          + Novo artigo
        </button>
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      {loading ? (
        <div className="bg-theme-card border border-theme rounded-lg p-8 text-center text-sm text-theme-muted">
          Carregando...
        </div>
      ) : artigos.length === 0 ? (
        <div className="bg-theme-card border border-theme rounded-lg p-12 text-center space-y-2">
          <p className="text-theme-muted text-sm">Nenhum artigo encontrado.</p>
          <button
            type="button"
            onClick={abrirNovo}
            className="text-sm text-primary hover:underline"
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
