"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import Image from "next/image";

type Produto = {
  marketplace: string;
  externalId: string;
  titulo: string;
  imagemUrl: string | null;
  preco: number | null;
  urlOriginal: string;
  urlAfiliado: string;
};

type ProdutoSalvo = Produto & { id: string; favorito: boolean; criadoEm: string };

function formatPreco(p: number | null): string {
  if (p == null) return "—";
  return p.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const EXTERNOS = [
  { label: "Magazine Luiza", href: (q: string) => `https://www.magazineluiza.com.br/busca/${encodeURIComponent(q)}/`, cor: "bg-blue-600" },
  { label: "Shopee", href: (q: string) => `https://shopee.com.br/search?keyword=${encodeURIComponent(q)}`, cor: "bg-orange-500" },
  { label: "Amazon", href: (q: string) => `https://www.amazon.com.br/s?k=${encodeURIComponent(q)}`, cor: "bg-yellow-500 text-black" },
];

export default function AfiliadoPage() {
  const searchParams = useSearchParams();
  const [mlConectado, setMlConectado] = useState<boolean | null>(null);
  const [mlDiag, setMlDiag] = useState<Record<string, unknown> | null>(null);
  const [mlMsg, setMlMsg] = useState("");

  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<Produto[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState("");

  const [favoritos, setFavoritos] = useState<ProdutoSalvo[]>([]);
  const [loadingFav, setLoadingFav] = useState(true);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [favoritando, setFavoritando] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<"busca" | "favoritos">("busca");

  async function checkMLStatus() {
    const { data } = await api<Record<string, unknown>>("/integrations/ml/status");
    setMlConectado((data?.connected as boolean) ?? false);
    if (data?.connected) setMlDiag(data);
  }

  async function loadFavoritos() {
    setLoadingFav(true);
    const { data, status } = await api<ProdutoSalvo[]>("/afiliados/produtos");
    if (status === 200 && Array.isArray(data)) setFavoritos(data);
    setLoadingFav(false);
  }

  useEffect(() => {
    checkMLStatus();
    loadFavoritos();

    const ml = searchParams.get("ml");
    if (ml === "connected") setMlMsg("✓ Mercado Livre autorizado com sucesso!");
    else if (ml === "error") {
      const reason = searchParams.get("reason") ?? "erro desconhecido";
      setMlMsg(`Erro ao autorizar ML: ${reason}`);
    }
  }, [searchParams]);

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    const q = busca.trim();
    if (!q) return;
    setBuscando(true);
    setErroBusca("");
    setResultados([]);
    setTermo(q);

    const { data, error, status } = await api<{ produtos: Produto[] }>(`/afiliados/buscar?q=${encodeURIComponent(q)}`);
    setBuscando(false);
    if (status === 200 && data) {
      setResultados(data.produtos);
      if (data.produtos.length === 0) setErroBusca("Nenhum produto encontrado no Mercado Livre.");
    } else {
      setErroBusca(error?.message ?? "Erro ao buscar.");
    }
  }

  async function copiarLink(produto: Produto | ProdutoSalvo) {
    const key = produto.externalId;
    try {
      await navigator.clipboard.writeText(produto.urlAfiliado);
      setCopiado(key);
      setTimeout(() => setCopiado(null), 2000);
    } catch { setCopiado(null); }
  }

  async function favoritar(produto: Produto) {
    const key = produto.externalId;
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

  const favoritosKeys = new Set(favoritos.map((f) => f.externalId));

  function renderCard(p: Produto | ProdutoSalvo, onRemover?: () => void) {
    const key = p.externalId;
    const jaFavoritado = favoritosKeys.has(key);
    return (
      <div key={key} className="bg-theme-card border border-theme rounded-xl overflow-hidden flex flex-col">
        <div className="w-full h-40 bg-gray-100 flex items-center justify-center relative overflow-hidden">
          {p.imagemUrl ? (
            <Image src={p.imagemUrl} alt={p.titulo} fill className="object-contain p-2" unoptimized />
          ) : (
            <span className="text-theme-muted text-xs">Sem imagem</span>
          )}
        </div>
        <div className="p-3 flex flex-col gap-2 flex-1">
          <p className="text-sm text-theme leading-tight line-clamp-2" title={p.titulo}>{p.titulo}</p>
          <p className="text-base font-bold text-theme-primary">{formatPreco(p.preco)}</p>
          <div className="flex gap-1.5 mt-auto pt-1 flex-wrap">
            <a href={p.urlAfiliado} target="_blank" rel="noopener noreferrer"
              className="flex-1 text-center text-xs py-1.5 rounded-lg bg-primary text-white min-w-[70px]">
              Ver produto
            </a>
            <button type="button" onClick={() => copiarLink(p)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-theme">
              {copiado === key ? "✓" : "Copiar"}
            </button>
            {onRemover ? (
              <button type="button" onClick={onRemover}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-theme text-red-500">✕</button>
            ) : (
              <button type="button" onClick={() => favoritar(p as Produto)}
                disabled={jaFavoritado || favoritando === key}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-theme disabled:opacity-40"
                style={{ color: jaFavoritado ? "var(--color-primary)" : "inherit" }}>
                {jaFavoritado ? "★" : "☆"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-theme-primary">Afiliado</h1>
        {/* Status e botão de autorização ML */}
        {mlConectado === false && (
          <button type="button"
            onClick={async () => {
              const { data } = await api<{ url: string }>("/integrations/ml/connect", { method: "POST" });
              if (data?.url) window.location.href = data.url;
            }}
            className="text-sm px-4 py-2 rounded-lg bg-yellow-400 text-black font-medium">
            Autorizar Mercado Livre
          </button>
        )}
        {mlConectado === true && (
          <span className="text-xs px-3 py-1.5 rounded-full bg-green-100 text-green-700 border border-green-300">
            ✓ ML conectado
          </span>
        )}
      </div>

      {mlDiag && (
        <div className="mb-4 p-3 rounded-lg border border-theme bg-theme-card text-xs font-mono text-theme-muted whitespace-pre-wrap">
          {JSON.stringify(mlDiag, null, 2)}
        </div>
      )}

      {mlMsg && (
        <div className={`mb-4 p-3 rounded-lg border text-sm ${mlMsg.startsWith("✓") ? "border-green-400 bg-green-50 text-green-700" : "border-red-400 bg-red-50 text-red-700"}`}>
          {mlMsg}
        </div>
      )}

      <p className="text-theme-muted text-sm mb-6">Busque no Mercado Livre ou abra a busca nos outros marketplaces.</p>

      <div className="flex gap-3 mb-6 border-b border-theme">
        {(["busca", "favoritos"] as const).map((aba) => (
          <button key={aba} type="button" onClick={() => setAbaAtiva(aba)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors -mb-px ${abaAtiva === aba ? "border-primary text-theme-primary" : "border-transparent text-theme-muted"}`}>
            {aba === "busca" ? "Buscar produtos" : `Favoritos${favoritos.length > 0 ? ` (${favoritos.length})` : ""}`}
          </button>
        ))}
      </div>

      {abaAtiva === "busca" && (
        <div>
          <form onSubmit={handleBuscar} className="flex gap-2 mb-4">
            <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome do produto (ex: furadeira, notebook...)"
              className="flex-1 px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
              disabled={buscando} />
            <button type="submit" disabled={!busca.trim() || buscando || mlConectado === false}
              className="px-5 py-2 bg-primary text-white rounded-lg disabled:opacity-50 whitespace-nowrap">
              {buscando ? "Buscando…" : "Buscar no ML"}
            </button>
          </form>

          {mlConectado === false && (
            <p className="text-sm text-yellow-600 mb-4">
              Autorize o Mercado Livre acima para ativar a busca.
            </p>
          )}

          {busca.trim() && (
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="text-xs text-theme-muted self-center">Buscar também em:</span>
              {EXTERNOS.map(({ label, href, cor }) => (
                <a key={label} href={href(busca.trim())} target="_blank" rel="noopener noreferrer"
                  className={`text-xs px-3 py-1.5 rounded-full text-white font-medium ${cor}`}>
                  {label} ↗
                </a>
              ))}
            </div>
          )}

          {erroBusca && (
            <div className="mb-4 p-3 rounded-lg border border-red-400 bg-red-50 text-red-700 text-sm">
              {erroBusca}
            </div>
          )}

          {resultados.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {resultados.map((p) => renderCard(p))}
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
              {favoritos.map((p) => renderCard(p, () => removerFavorito(p.id)))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
