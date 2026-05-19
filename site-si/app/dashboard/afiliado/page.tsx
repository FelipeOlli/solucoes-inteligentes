"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Image from "next/image";

type Marketplace = "ML" | "MAGALU";

type Produto = {
  marketplace: Marketplace;
  externalId: string;
  titulo: string;
  imagemUrl: string | null;
  preco: number | null;
  urlOriginal: string;
  urlAfiliado: string;
};

type ProdutoSalvo = Produto & { id: string; favorito: boolean; criadoEm: string };

const MARKETPLACE_LABELS: Record<string, string> = { ML: "Mercado Livre", MAGALU: "Magalu" };
const MARKETPLACE_COLORS: Record<string, string> = {
  ML: "bg-yellow-100 text-yellow-800",
  MAGALU: "bg-blue-100 text-blue-800",
};

function formatPreco(p: number | null): string {
  if (p == null) return "—";
  return p.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AfiliadoPage() {
  const [busca, setBusca] = useState("");
  const [marketplace, setMarketplace] = useState<"ALL" | Marketplace>("ALL");
  const [resultados, setResultados] = useState<Produto[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState("");
  const [favoritos, setFavoritos] = useState<ProdutoSalvo[]>([]);
  const [loadingFav, setLoadingFav] = useState(true);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [favoritando, setFavoritando] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<"busca" | "favoritos">("busca");

  async function loadFavoritos() {
    setLoadingFav(true);
    const { data, status } = await api<ProdutoSalvo[]>("/afiliados/produtos");
    if (status === 200 && Array.isArray(data)) setFavoritos(data);
    setLoadingFav(false);
  }

  useEffect(() => {
    loadFavoritos();
  }, []);

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    const q = busca.trim();
    if (!q) return;
    setBuscando(true);
    setErroBusca("");
    setResultados([]);
    const { data, status } = await api<{ produtos: Produto[] }>(`/afiliados/buscar?q=${encodeURIComponent(q)}&marketplace=${marketplace}`);
    setBuscando(false);
    if (status === 200 && data) {
      setResultados(data.produtos);
      if (data.produtos.length === 0) setErroBusca("Nenhum produto encontrado.");
    } else {
      setErroBusca("Erro ao buscar. Tente novamente.");
    }
  }

  async function copiarLink(produto: Produto) {
    try {
      await navigator.clipboard.writeText(produto.urlAfiliado);
      setCopiado(produto.externalId + produto.marketplace);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      setCopiado(null);
    }
  }

  async function favoritar(produto: Produto) {
    const key = produto.externalId + produto.marketplace;
    setFavoritando(key);
    await api<ProdutoSalvo>("/afiliados/produtos", {
      method: "POST",
      body: {
        marketplace: produto.marketplace,
        externalId: produto.externalId,
        titulo: produto.titulo,
        imagemUrl: produto.imagemUrl,
        preco: produto.preco,
        urlOriginal: produto.urlOriginal,
        urlAfiliado: produto.urlAfiliado,
      },
    });
    setFavoritando(null);
    await loadFavoritos();
  }

  async function removerFavorito(id: string) {
    await api(`/afiliados/produtos/${id}`, { method: "DELETE" });
    setFavoritos((prev) => prev.filter((f) => f.id !== id));
  }

  const favoritosKeys = new Set(favoritos.map((f) => f.externalId + f.marketplace));

  return (
    <div>
      <h1 className="font-heading text-xl sm:text-2xl font-bold text-theme-primary mb-1">Afiliado</h1>
      <p className="text-theme-muted text-sm mb-6">Busque produtos e copie o link de afiliado para compartilhar com clientes.</p>

      <div className="flex gap-3 mb-6 border-b border-theme">
        {(["busca", "favoritos"] as const).map((aba) => (
          <button
            key={aba}
            type="button"
            onClick={() => setAbaAtiva(aba)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              abaAtiva === aba ? "border-primary text-theme-primary" : "border-transparent text-theme-muted"
            }`}
          >
            {aba === "busca" ? "Buscar produtos" : `Favoritos${favoritos.length > 0 ? ` (${favoritos.length})` : ""}`}
          </button>
        ))}
      </div>

      {abaAtiva === "busca" && (
        <div>
          <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row gap-2 mb-6">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome do produto (ex: furadeira, cabo HDMI...)"
              className="flex-1 px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
              disabled={buscando}
            />
            <select
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value as typeof marketplace)}
              className="px-3 py-2 border rounded-lg bg-theme-card border-theme text-theme text-sm"
              disabled={buscando}
            >
              <option value="ALL">Todos</option>
              <option value="ML">Mercado Livre</option>
              <option value="MAGALU">Magalu</option>
            </select>
            <button
              type="submit"
              disabled={!busca.trim() || buscando}
              className="px-5 py-2 bg-primary text-white rounded-lg disabled:opacity-50 whitespace-nowrap"
            >
              {buscando ? "Buscando…" : "Buscar"}
            </button>
          </form>

          {erroBusca && <p className="text-red-600 text-sm mb-4">{erroBusca}</p>}

          {resultados.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {resultados.map((p) => {
                const key = p.externalId + p.marketplace;
                const jaFavoritado = favoritosKeys.has(key);
                return (
                  <div key={key} className="bg-theme-card border border-theme rounded-xl overflow-hidden flex flex-col">
                    <div className="w-full h-40 bg-gray-100 flex items-center justify-center relative overflow-hidden">
                      {p.imagemUrl ? (
                        <Image
                          src={p.imagemUrl}
                          alt={p.titulo}
                          fill
                          className="object-contain p-2"
                          unoptimized
                        />
                      ) : (
                        <span className="text-theme-muted text-xs">Sem imagem</span>
                      )}
                    </div>
                    <div className="p-3 flex flex-col gap-2 flex-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${MARKETPLACE_COLORS[p.marketplace]}`}>
                        {MARKETPLACE_LABELS[p.marketplace]}
                      </span>
                      <p className="text-sm text-theme leading-tight line-clamp-2" title={p.titulo}>
                        {p.titulo}
                      </p>
                      <p className="text-base font-bold text-theme-primary">{formatPreco(p.preco)}</p>
                      <div className="flex gap-2 mt-auto pt-1">
                        <button
                          type="button"
                          onClick={() => copiarLink(p)}
                          className="flex-1 text-xs py-1.5 rounded-lg border border-theme bg-primary text-white transition"
                        >
                          {copiado === key ? "Copiado!" : "Copiar link"}
                        </button>
                        <button
                          type="button"
                          onClick={() => favoritar(p)}
                          disabled={jaFavoritado || favoritando === key}
                          title={jaFavoritado ? "Já nos favoritos" : "Salvar nos favoritos"}
                          className="px-2.5 py-1.5 rounded-lg border border-theme text-sm disabled:opacity-40 transition"
                          style={{ color: jaFavoritado ? "var(--color-primary)" : "inherit" }}
                        >
                          {jaFavoritado ? "★" : "☆"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {abaAtiva === "favoritos" && (
        <div>
          {loadingFav ? (
            <p className="text-theme-muted text-sm">Carregando…</p>
          ) : favoritos.length === 0 ? (
            <p className="text-theme-muted text-sm">Nenhum produto favoritado ainda.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {favoritos.map((p) => {
                const key = p.externalId + p.marketplace;
                return (
                  <div key={p.id} className="bg-theme-card border border-theme rounded-xl overflow-hidden flex flex-col">
                    <div className="w-full h-40 bg-gray-100 flex items-center justify-center relative overflow-hidden">
                      {p.imagemUrl ? (
                        <Image
                          src={p.imagemUrl}
                          alt={p.titulo}
                          fill
                          className="object-contain p-2"
                          unoptimized
                        />
                      ) : (
                        <span className="text-theme-muted text-xs">Sem imagem</span>
                      )}
                    </div>
                    <div className="p-3 flex flex-col gap-2 flex-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${MARKETPLACE_COLORS[p.marketplace]}`}>
                        {MARKETPLACE_LABELS[p.marketplace]}
                      </span>
                      <p className="text-sm text-theme leading-tight line-clamp-2" title={p.titulo}>
                        {p.titulo}
                      </p>
                      <p className="text-base font-bold text-theme-primary">{formatPreco(p.preco)}</p>
                      <div className="flex gap-2 mt-auto pt-1">
                        <button
                          type="button"
                          onClick={() => copiarLink(p)}
                          className="flex-1 text-xs py-1.5 rounded-lg bg-primary text-white transition"
                        >
                          {copiado === key ? "Copiado!" : "Copiar link"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removerFavorito(p.id)}
                          title="Remover dos favoritos"
                          className="px-2.5 py-1.5 rounded-lg border border-theme text-sm text-red-500 transition"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
