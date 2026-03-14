"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Categoria = { id: string; nome: string };

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoNome, setNovoNome] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  function normaliseList(raw: unknown): Categoria[] {
    if (Array.isArray(raw)) return raw as Categoria[];
    if (raw && typeof raw === "object" && Array.isArray((raw as { categorias?: unknown }).categorias)) {
      return (raw as { categorias: Categoria[] }).categorias;
    }
    return [];
  }

  function load() {
    setLoadError("");
    api<Categoria[]>("/categorias").then(({ data, status }) => {
      if (status === 200) {
        setCategorias(normaliseList(data));
      } else {
        setLoadError(`Não foi possível carregar as categorias (${status}). Tente recarregar a página.`);
      }
    }).catch(() => {
      setLoadError("Erro de conexão ao carregar categorias. Verifique se o servidor está rodando.");
    }).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    const nome = novoNome.trim();
    if (!nome) return;
    setError("");
    const { data, status } = await api<Categoria>("/categorias", {
      method: "POST",
      body: { nome },
    });
    if (status === 401) return;
    if (status === 201 && data) {
      setNovoNome("");
      load();
    } else {
      setError("Não foi possível criar. Nome já existe?");
    }
  }

  async function handleSalvarEdicao(id: string) {
    const nome = editNome.trim();
    if (!nome) return;
    setError("");
    const { data, status } = await api<Categoria>(`/categorias/${id}`, {
      method: "PATCH",
      body: { nome },
    });
    if (status === 401) return;
    if (status === 200 && data) {
      setEditId(null);
      setEditNome("");
      load();
    } else {
      setError("Não foi possível atualizar. Nome já existe?");
    }
  }

  async function handleExcluir(id: string, nome: string) {
    if (!confirm(`Excluir a categoria "${nome}"? Serviços vinculados podem ficar sem categoria.`)) return;
    setError("");
    const { status } = await api(`/categorias/${id}`, { method: "DELETE" });
    if (status === 401) return;
    if (status === 200) {
      if (editId === id) setEditId(null);
      load();
    } else {
      setError("Não foi possível excluir.");
    }
  }

  if (loading) return <p className="text-body">Carregando…</p>;

  return (
    <div>
      <h1 className="font-heading text-xl sm:text-2xl font-bold text-theme-primary mb-4">Categorias de serviço</h1>

      <form onSubmit={handleCriar} className="bg-theme-card p-4 rounded-lg border border-theme mb-6 max-w-md">
        <h2 className="font-heading font-bold text-theme-primary mb-2">Nova categoria</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome da categoria"
            className="flex-1 px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
          />
          <button type="submit" disabled={!novoNome.trim()} className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50 w-full sm:w-auto">
            Adicionar
          </button>
        </div>
      </form>

      {loadError && <p className="text-red-600 mb-4">{loadError} <button type="button" onClick={() => { setLoading(true); load(); }} className="underline ml-1">Recarregar</button></p>}

      <div className="bg-theme-card rounded-lg border border-theme overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-theme">
          <thead className="border-b border-theme" style={{ backgroundColor: "var(--color-navbar)" }}>
            <tr>
              <th className="px-4 py-3 font-heading font-bold text-theme-primary">Nome</th>
              <th className="px-4 py-3 font-heading font-bold text-theme-primary w-32">Ações</th>
            </tr>
          </thead>
          <tbody>
            {categorias.length === 0 && !loading ? (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-theme-muted text-center">Nenhuma categoria cadastrada.</td>
              </tr>
            ) : (
              categorias.map((c) => (
                <tr key={c.id} className="border-b border-theme last:border-b-0">
                  <td className="px-4 py-3">
                    {editId === c.id ? (
                      <input
                        type="text"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        className="w-full max-w-xs px-3 py-1 border rounded bg-theme-card border-theme text-theme"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSalvarEdicao(c.id);
                          if (e.key === "Escape") setEditId(null);
                        }}
                      />
                    ) : (
                      <span className="text-body">{c.nome}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    {editId === c.id ? (
                      <>
                        <button type="button" onClick={() => handleSalvarEdicao(c.id)} className="text-sm text-theme-primary underline">Salvar</button>
                        <button type="button" onClick={() => setEditId(null)} className="text-sm text-theme-muted underline">Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => { setEditId(c.id); setEditNome(c.nome); }} className="text-sm text-theme-primary underline">Editar</button>
                        <button type="button" onClick={() => handleExcluir(c.id, c.nome)} className="text-sm text-red-600 underline">Excluir</button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {error && <p className="text-red-600 mt-4">{error}</p>}
    </div>
  );
}
