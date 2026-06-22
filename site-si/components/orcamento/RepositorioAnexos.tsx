"use client";

import { useState, useEffect, useRef } from "react";

interface Anexo {
  id: string;
  categoria: "MODELO" | "CARIMBO";
  rotulo: string;
  tipoCarimbo: "PIX" | "CARTAO_CREDITO" | "CHEQUE" | null;
  nomeArquivo: string;
  url: string;
  mimeType: string;
  tamanhoBytes: number;
  createdAt: string;
}

const TIPO_CARIMBO_LABELS: Record<string, string> = {
  PIX: "PIX",
  CARTAO_CREDITO: "Cartão de crédito",
  CHEQUE: "Cheque",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("si_token");
}

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function RepositorioAnexos() {
  const [modelos, setModelos] = useState<Anexo[]>([]);
  const [carimbos, setCarimbos] = useState<Anexo[]>([]);
  const [carregando, setCarregando] = useState(true);

  // estado de upload — modelos
  const [modeloRotulo, setModeloRotulo] = useState("");
  const [modeloFile, setModeloFile] = useState<File | null>(null);
  const [enviandoModelo, setEnviandoModelo] = useState(false);
  const modeloInputRef = useRef<HTMLInputElement>(null);

  // estado de upload — carimbos
  const [carimboTipo, setCarimboTipo] = useState<"PIX" | "CARTAO_CREDITO" | "CHEQUE">("PIX");
  const [carimboFile, setCarimboFile] = useState<File | null>(null);
  const [enviandoCarimbo, setEnviandoCarimbo] = useState(false);
  const carimboInputRef = useRef<HTMLInputElement>(null);

  async function carregarAnexos() {
    setCarregando(true);
    try {
      const token = getToken();
      const headers = authHeaders(token);
      const [resM, resC] = await Promise.all([
        fetch("/api/orcamento/anexos?categoria=MODELO", { headers }),
        fetch("/api/orcamento/anexos?categoria=CARIMBO", { headers }),
      ]);
      if (resM.ok) setModelos(await resM.json());
      if (resC.ok) setCarimbos(await resC.json());
    } catch (e) {
      console.error("Erro ao carregar anexos:", e);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregarAnexos(); }, []);

  async function enviarModelo() {
    if (!modeloFile || !modeloRotulo.trim()) return;
    setEnviandoModelo(true);
    try {
      const token = getToken();
      const form = new FormData();
      form.append("file", modeloFile);
      form.append("categoria", "MODELO");
      form.append("rotulo", modeloRotulo.trim());

      const res = await fetch("/api/orcamento/anexos", {
        method: "POST",
        headers: authHeaders(token),
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.message ?? err?.error ?? `Erro ${res.status}`);
        return;
      }
      setModeloRotulo("");
      setModeloFile(null);
      if (modeloInputRef.current) modeloInputRef.current.value = "";
      await carregarAnexos();
    } catch (e) {
      alert(`Erro de rede: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setEnviandoModelo(false);
    }
  }

  async function enviarCarimbo() {
    if (!carimboFile) return;
    setEnviandoCarimbo(true);
    try {
      const token = getToken();
      const form = new FormData();
      form.append("file", carimboFile);
      form.append("categoria", "CARIMBO");
      form.append("rotulo", TIPO_CARIMBO_LABELS[carimboTipo]);
      form.append("tipoCarimbo", carimboTipo);

      const res = await fetch("/api/orcamento/anexos", {
        method: "POST",
        headers: authHeaders(token),
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.message ?? err?.error ?? `Erro ${res.status}`);
        return;
      }
      setCarimboFile(null);
      if (carimboInputRef.current) carimboInputRef.current.value = "";
      await carregarAnexos();
    } catch (e) {
      alert(`Erro de rede: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setEnviandoCarimbo(false);
    }
  }

  async function remover(id: string) {
    if (!confirm("Remover este arquivo?")) return;
    const token = getToken();
    const res = await fetch(`/api/orcamento/anexos/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    if (res.ok) await carregarAnexos();
    else alert("Erro ao remover.");
  }

  return (
    <div className="mt-8 space-y-6">
      {/* ── Modelos de orçamento ── */}
      <div className="bg-theme-card p-6 rounded-lg border border-theme">
        <h2 className="font-heading text-base font-semibold text-theme-primary mb-4">
          Modelos de orçamento
        </h2>
        <p className="text-xs text-theme-muted mb-4">
          Armazene modelos prontos (o seu e os das coberturas) para consultar e baixar quando precisar.
        </p>

        {/* Upload de modelo */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-theme-muted mb-1">Nome do modelo</label>
            <input
              type="text"
              value={modeloRotulo}
              onChange={(e) => setModeloRotulo(e.target.value)}
              placeholder="Ex: Soluções Inteligentes, Cobertura Empresa X"
              className="w-full px-3 py-2 border rounded-lg bg-theme-card border-theme text-theme text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-theme-muted mb-1">Arquivo</label>
            <input
              ref={modeloInputRef}
              type="file"
              onChange={(e) => setModeloFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-theme-muted file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:opacity-90 cursor-pointer"
            />
          </div>
          <button
            onClick={enviarModelo}
            disabled={enviandoModelo || !modeloFile || !modeloRotulo.trim()}
            className="px-4 py-2 rounded-lg bg-theme-cta font-medium text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {enviandoModelo ? "Enviando..." : "Anexar"}
          </button>
        </div>

        {/* Lista de modelos */}
        {carregando ? (
          <p className="text-sm text-theme-muted">Carregando...</p>
        ) : modelos.length === 0 ? (
          <p className="text-sm text-theme-muted">Nenhum modelo anexado ainda.</p>
        ) : (
          <ul className="divide-y divide-theme">
            {modelos.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-theme truncate">{m.rotulo}</p>
                  <p className="text-xs text-theme-muted truncate">{m.nomeArquivo} · {formatBytes(m.tamanhoBytes)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a
                    href={m.url}
                    download={m.nomeArquivo}
                    className="px-3 py-1 text-xs rounded-lg border border-theme text-theme hover:opacity-80"
                  >
                    Baixar
                  </a>
                  <button
                    onClick={() => remover(m.id)}
                    className="px-3 py-1 text-xs rounded-lg border border-red-300 text-red-500 hover:opacity-80"
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Carimbos ── */}
      <div className="bg-theme-card p-6 rounded-lg border border-theme">
        <h2 className="font-heading text-base font-semibold text-theme-primary mb-4">
          Carimbos de pagamento
        </h2>
        <p className="text-xs text-theme-muted mb-4">
          Armazene imagens de carimbo por tipo de pagamento (PIX, Cartão de crédito, Cheque).
        </p>

        {/* Upload de carimbo */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">Tipo</label>
            <select
              value={carimboTipo}
              onChange={(e) => setCarimboTipo(e.target.value as typeof carimboTipo)}
              className="px-3 py-2 border rounded-lg bg-theme-card border-theme text-theme text-sm"
            >
              <option value="PIX">PIX</option>
              <option value="CARTAO_CREDITO">Cartão de crédito</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-theme-muted mb-1">Arquivo</label>
            <input
              ref={carimboInputRef}
              type="file"
              onChange={(e) => setCarimboFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-theme-muted file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:opacity-90 cursor-pointer"
            />
          </div>
          <button
            onClick={enviarCarimbo}
            disabled={enviandoCarimbo || !carimboFile}
            className="px-4 py-2 rounded-lg bg-theme-cta font-medium text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {enviandoCarimbo ? "Enviando..." : "Anexar"}
          </button>
        </div>

        {/* Lista de carimbos */}
        {carregando ? (
          <p className="text-sm text-theme-muted">Carregando...</p>
        ) : carimbos.length === 0 ? (
          <p className="text-sm text-theme-muted">Nenhum carimbo anexado ainda.</p>
        ) : (
          <ul className="divide-y divide-theme">
            {carimbos.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0">
                  <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary mb-1">
                    {c.tipoCarimbo ? TIPO_CARIMBO_LABELS[c.tipoCarimbo] : c.rotulo}
                  </span>
                  <p className="text-xs text-theme-muted truncate">{c.nomeArquivo} · {formatBytes(c.tamanhoBytes)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a
                    href={c.url}
                    download={c.nomeArquivo}
                    className="px-3 py-1 text-xs rounded-lg border border-theme text-theme hover:opacity-80"
                  >
                    Baixar
                  </a>
                  <button
                    onClick={() => remover(c.id)}
                    className="px-3 py-1 text-xs rounded-lg border border-red-300 text-red-500 hover:opacity-80"
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
